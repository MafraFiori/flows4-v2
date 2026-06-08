// Types extracted from service.ts

export type B1Credentials = {
    url: string;
    companydb: string;
    username: string;
    password: string;
};

export type B1Session = {
    cookie: string;
    expiresAt: number;
};

export type B1ContextState = {
    credentials: B1Credentials;
    session?: B1Session;
};

export type B1ContextRow = {
    token: string;
    url: string;
    companydb: string;
    username: string;
    password: string;
    sessionCookie?: string | null;
    sessionExpiresAt?: string | Date | null;
};

export type CdsElementLike = {
    type?: string;
};

export type CdsEntityLike = {
    name?: string;
    elements?: Record<string, CdsElementLike>;
};

export type CdsModelLike = {
    definitions?: Record<string, {
        elements?: Record<string, Record<string, unknown>>;
    }>;
};

export type B1CollectionPayload = {
    value?: unknown[];
    "@odata.nextLink"?: string;
    "odata.nextLink"?: string;
};
