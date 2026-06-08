import cds from "@sap/cds";
import crypto from "node:crypto";
import { B1Credentials, B1ContextState, B1Session } from "../types";
import { trimTrailingSlash } from "./service-utils";

export async function setB1ContextHandler(req: cds.Request, getEncryptionKey: () => Buffer, loginB1: (credentials: B1Credentials) => Promise<string>, b1ContextByToken: Map<string, B1ContextState>, saveContextToDb: (token: string, context: B1ContextState) => Promise<void>, SESSION_TTL_MS: number): Promise<string> {
    const { url, companydb, username, password } = req.data as Partial<B1Credentials>;

    if (!url || !companydb || !username || !password) {
        req.reject(400, "Informe url, companydb, username e password.");
    }

    const credentials: B1Credentials = {
        url: trimTrailingSlash(url),
        companydb,
        username,
        password
    };

    getEncryptionKey();

    let cookie: string;
    try {
        cookie = await loginB1(credentials);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        req.reject(502, `Falha ao conectar no SAP B1 Service Layer: ${message}`);
    }

    const token = crypto.randomUUID();

    const context: B1ContextState = {
        credentials,
        session: {
            cookie,
            expiresAt: Date.now() + SESSION_TTL_MS
        }
    };

    b1ContextByToken.set(token, context);
    await saveContextToDb(token, context);

    return token;
}
