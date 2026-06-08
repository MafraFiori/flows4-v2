import { B1Credentials, B1ContextState, B1CollectionPayload } from "../types";
import { getB1CredentialsFromEnv, trimTrailingSlash } from "./service-utils";
import cds from "@sap/cds";

const SESSION_TTL_MS = 25 * 60 * 1000;

export async function getB1Credentials(req: cds.Request, b1Core: any): Promise<B1Credentials> {
    const token = b1Core.getContextToken(req);
    if (token) {
        const context = await b1Core.resolveContextByToken(token);
        if (!context) {
            throw new Error("Contexto B1 inválido ou expirado. Faça login novamente.");
        }
        return context.credentials;
    }

    const credentialsFromCds = cds.env.requires?.b1?.credentials as Partial<B1Credentials> | undefined;
    const credentialsFromEnv = getB1CredentialsFromEnv();

    const credentials: Partial<B1Credentials> = {
        url: credentialsFromCds?.url ?? credentialsFromEnv.url,
        companydb: credentialsFromCds?.companydb ?? credentialsFromEnv.companydb,
        username: credentialsFromCds?.username ?? credentialsFromEnv.username,
        password: credentialsFromCds?.password ?? credentialsFromEnv.password
    };

    if (!credentials.url || !credentials.companydb || !credentials.username || !credentials.password) {
        throw new Error(
            "Configuração incompleta de credenciais B1. Defina cds.requires.b1.credentials.* ou B1_URL, B1_COMPANYDB, B1_USERNAME, B1_PASSWORD no .env."
        );
    }

    return {
        url: trimTrailingSlash(credentials.url),
        companydb: credentials.companydb,
        username: credentials.username,
        password: credentials.password
    };
}

export async function loginB1(credentials: B1Credentials): Promise<string> {
    const loginUrl = `${credentials.url}/Login`;

    const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            CompanyDB: credentials.companydb,
            UserName: credentials.username,
            Password: credentials.password
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Falha no login do B1 Service Layer (${response.status}): ${body}`);
    }

    const setCookieHeader = response.headers.get("set-cookie");
    if (!setCookieHeader) {
        throw new Error("Login no B1 Service Layer não retornou cookie de sessão.");
    }

    const cookie = setCookieHeader
        .split(",")
        .map((chunk) => chunk.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");

    if (!cookie) {
        throw new Error("Cookie de sessão inválido retornado pelo B1 Service Layer.");
    }

    return cookie;
}

export async function getB1SessionCookie(req: cds.Request, b1Core: any, loginB1Fn: (credentials: B1Credentials) => Promise<string>, explicitCredentials?: B1Credentials): Promise<string> {
    const token = b1Core.getContextToken(req);
    if (token) {
        const context = await b1Core.resolveContextByToken(token);
        if (!context) {
            throw new Error("Contexto B1 inválido ou expirado. Faça login novamente.");
        }

        const cachedSession = context.session;
        if (!explicitCredentials && b1Core.isSessionValid(cachedSession)) {
            return cachedSession.cookie;
        }

        const credentials = explicitCredentials ?? context.credentials;
        const cookie = await loginB1Fn(credentials);

        const updatedContext: B1ContextState = {
            credentials,
            session: {
                cookie,
                expiresAt: Date.now() + SESSION_TTL_MS
            }
        };

        b1Core.b1ContextByToken.set(token, updatedContext);
        await b1Core.saveContextToDb(token, updatedContext);

        return cookie;
    }

    if (!explicitCredentials && b1Core.b1FallbackSession && b1Core.b1FallbackSession.expiresAt > Date.now()) {
        return b1Core.b1FallbackSession.cookie;
    }

    const credentials = explicitCredentials ?? await getB1Credentials(req, b1Core);
    const cookie = await loginB1Fn(credentials);

    b1Core.b1FallbackSession = {
        cookie,
        expiresAt: Date.now() + SESSION_TTL_MS
    };

    return cookie;
}

export async function fetchB1Get(req: cds.Request, endpoint: string, b1Core: any, getB1SessionCookieFn: (req: cds.Request, b1Core: any, loginB1Fn: (credentials: B1Credentials) => Promise<string>, explicitCredentials?: B1Credentials) => Promise<string>, loginB1Fn: (credentials: B1Credentials) => Promise<string>, token?: string, accept = "application/json"): Promise<Response> {
    let cookie = await getB1SessionCookieFn(req, b1Core, loginB1Fn);
    let response = await fetch(endpoint, {
        method: "GET",
        headers: {
            Cookie: cookie,
            Accept: accept
        }
    });

    if (response.status === 401) {
        if (token) {
            const context = await b1Core.resolveContextByToken(token);
            if (context) {
                context.session = undefined;
                b1Core.b1ContextByToken.set(token, context);
                await b1Core.saveContextToDb(token, context);
            }
        } else {
            b1Core.b1FallbackSession = undefined;
        }

        cookie = await getB1SessionCookieFn(req, b1Core, loginB1Fn);
        response = await fetch(endpoint, {
            method: "GET",
            headers: {
                Cookie: cookie,
                Accept: accept
            }
        });
    }

    return response;
}

export function getB1NextLink(payload: B1CollectionPayload): string | undefined {
    return payload["@odata.nextLink"] ?? payload["odata.nextLink"];
}

export function toAbsoluteB1Url(baseUrl: string, maybeRelativeUrl: string): string {
    if (/^https?:\/\//i.test(maybeRelativeUrl)) {
        return maybeRelativeUrl;
    }
    return `${trimTrailingSlash(baseUrl)}/${maybeRelativeUrl.replace(/^\/+/, "")}`;
}
