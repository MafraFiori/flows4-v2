import { B1Credentials } from "../types";

export function trimTrailingSlash(url: string): string {
    return url.replace(/\/+$/, "");
}

export function getB1CredentialsFromEnv(): Partial<B1Credentials> {
    return {
        url: process.env.B1_URL
            ?? process.env.B1_SERVICE_LAYER_URL
            ?? process.env["cds.requires.b1.credentials.url"],
        companydb: process.env.B1_COMPANYDB
            ?? process.env.B1_COMPANY_DB
            ?? process.env["cds.requires.b1.credentials.companydb"],
        username: process.env.B1_USERNAME
            ?? process.env.B1_USER
            ?? process.env["cds.requires.b1.credentials.username"],
        password: process.env.B1_PASSWORD
            ?? process.env.B1_PASS
            ?? process.env["cds.requires.b1.credentials.password"]
    };
}