import cds from "@sap/cds";
import { setB1ContextHandler } from "./handlers/setB1Context";
import { B1ContextCore } from "./handlers/b1ContextCore";
import {
    loginB1
} from "./handlers/b1Session";

const SESSION_TTL_MS = 25 * 60 * 1000;

export default class flows4Service extends cds.ApplicationService {
    private readonly b1Core = new B1ContextCore();
    async init() {
        this.on("setB1Context", async (req: cds.Request) =>
            setB1ContextHandler(
                req,
                this.b1Core.getEncryptionKey.bind(this.b1Core),
                (credentials) => loginB1(credentials),
                this.b1Core.b1ContextByToken,
                this.b1Core.saveContextToDb.bind(this.b1Core),
                SESSION_TTL_MS
            )
        );
    }
}