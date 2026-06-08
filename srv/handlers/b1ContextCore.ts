import crypto from "node:crypto";
import { B1Session, B1ContextState, B1ContextRow, CdsEntityLike, CdsModelLike } from "../types";
import { trimTrailingSlash } from "./service-utils";
import cds from "@sap/cds";

export class B1ContextCore {
    public readonly b1ContextByToken = new Map<string, B1ContextState>();
    public readonly boYesNoFieldsByEntity = new Map<string, string[]>();
    public readonly valueHelpEntities = new Set<string>();
    public b1FallbackSession?: B1Session;
    public readonly b1ContextsEntity = "flows4.db.B1Contexts";
    private encryptionKey?: Buffer;

    public getBoYesNoFields(entity: CdsEntityLike | undefined): string[] {
        return [];
    }

    public normalizeBoYesNoValue(value: unknown): unknown {
        return value;
    }

    public normalizeBoYesNoRows(rows: unknown[], fields: string[]): unknown[] {        
        return rows;
    }

    public initializeValueHelpEntities(model: CdsModelLike | undefined): void {
        this.valueHelpEntities.clear();

        const definitions = model?.definitions ?? {};

        const addCollectionPath = (value: unknown): void => {
            if (typeof value === "string" && value.trim()) {
                this.valueHelpEntities.add(value.trim());
            }
        };

        for (const definition of Object.values(definitions)) {
            const elements = definition?.elements;
            if (!elements) {
                continue;
            }

            for (const element of Object.values(elements)) {
                const valueList = element["@Common.ValueList"] as { CollectionPath?: unknown } | undefined;
                addCollectionPath(valueList?.CollectionPath);

                // Some CDS compilations flatten this annotation path.
                addCollectionPath(element["@Common.ValueList.CollectionPath"]);
            }
        }

        // Backward-safe fallbacks in case model annotations are unavailable at runtime.
        this.valueHelpEntities.add("ItemsGroups");
        this.valueHelpEntities.add("NCMCodesSetup");
    }

    public getContextToken(req: cds.Request): string | undefined {
        const raw = (req.http?.req?.headers?.["x-b1-context"] ?? req.http?.req?.headers?.["X-B1-Context"]) as string | string[] | undefined;
        const token = Array.isArray(raw) ? raw[0] : raw;
        return typeof token === "string" && token.trim() ? token.trim() : undefined;
    }

    public isSessionValid(session?: B1Session): session is B1Session {
        return Boolean(session && session.expiresAt > Date.now());
    }

    public getEncryptionKey(): Buffer {
        if (this.encryptionKey) {
            return this.encryptionKey;
        }
        const keyB64 = process.env.B1_CONTEXT_ENCRYPTION_KEY;
        if (!keyB64) {
            throw new Error("Defina B1_CONTEXT_ENCRYPTION_KEY (base64 de 32 bytes) para persistir contexto B1 com criptografia.");
        }
        const key = Buffer.from(keyB64, "base64");
        if (key.length !== 32) {
            throw new Error("B1_CONTEXT_ENCRYPTION_KEY inválida. Use uma chave base64 de 32 bytes.");
        }
        this.encryptionKey = key;
        return key;
    }

    public encryptSecret(secret: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", this.getEncryptionKey(), iv);
        const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `enc:v1:${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
    }

    public decryptSecret(secret: string): string {
        const ENCRYPTED_PREFIX = "enc:v1:";
        if (!secret.startsWith(ENCRYPTED_PREFIX)) {
            return secret;
        }
        const payload = secret.slice(ENCRYPTED_PREFIX.length);
        const parts = payload.split(".");
        if (parts.length !== 3) {
            throw new Error("Formato de segredo criptografado inválido para contexto B1.");
        }
        const [ivB64, tagB64, encryptedB64] = parts;
        const iv = Buffer.from(ivB64, "base64");
        const tag = Buffer.from(tagB64, "base64");
        const encrypted = Buffer.from(encryptedB64, "base64");
        const decipher = crypto.createDecipheriv("aes-256-gcm", this.getEncryptionKey(), iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString("utf8");
    }

    public toSession(row: Pick<B1ContextRow, "sessionCookie" | "sessionExpiresAt">): B1Session | undefined {
        if (!row.sessionCookie || !row.sessionExpiresAt) {
            return undefined;
        }
        const expiresAt = new Date(row.sessionExpiresAt).getTime();
        if (!Number.isFinite(expiresAt)) {
            return undefined;
        }
        return {
            cookie: row.sessionCookie,
            expiresAt
        };
    }

    public async readContextFromDb(token: string): Promise<B1ContextState | undefined> {
        const row = await cds.db?.run(
            SELECT.one.from(this.b1ContextsEntity).where({ token })
        ) as B1ContextRow | undefined;
        if (!row) {
            return undefined;
        }
        const context: B1ContextState = {
            credentials: {
                url: trimTrailingSlash(row.url),
                companydb: row.companydb,
                username: row.username,
                password: this.decryptSecret(row.password)
            },
            session: this.toSession(row)
        };
        this.b1ContextByToken.set(token, context);
        return context;
    }

    public async saveContextToDb(token: string, context: B1ContextState): Promise<void> {
        await cds.db?.run(
            UPSERT.into(this.b1ContextsEntity).entries({
                token,
                url: context.credentials.url,
                companydb: context.credentials.companydb,
                username: context.credentials.username,
                password: this.encryptSecret(context.credentials.password),
                sessionCookie: context.session?.cookie ?? null,
                sessionExpiresAt: context.session ? new Date(context.session.expiresAt).toISOString() : null
            })
        );
    }

    public async resolveContextByToken(token: string): Promise<B1ContextState | undefined> {
        const inMemory = this.b1ContextByToken.get(token);
        if (inMemory) {
            return inMemory;
        }
        return this.readContextFromDb(token);
    }
}
