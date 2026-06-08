import BaseController from "../../BaseController/BaseController.controller";
import MessageBox from "sap/m/MessageBox";

declare const sap: any;

type Empresa = {
    id: string;
    name: string;
    url: string;
    db: string;
};

type B1ContextActionResult = {
    value?: string;
    setB1Context?: string;
};

type B1User = {
    InternalKey?: number;
    UserCode?: string;
    UserName?: string;
    eMail?: string;
    MobilePhoneNumber?: string;
    Branch?: number;
    Department?: number;
    Superuser?: boolean;
    [key: string]: unknown;
};

type EnviromentData = {
    companydb: string;
    url: string;
    login: string;
};

type MainModel = {
    setHeaders?: (headers: Record<string, string>) => void;
    callFunction?: (
        path: string,
        parameters: {
            method: "POST" | "GET";
            urlParameters: Record<string, string>;
            success: (data: B1ContextActionResult | string | undefined) => void;
            error: (error: unknown) => void;
        }
    ) => void;
    read?: (
        path: string,
        parameters: {
            urlParameters?: Record<string, string>;
            success: (data: { results?: B1User[] } | B1User[] | undefined) => void;
            error: (error: unknown) => void;
        }
    ) => void;
};

/**
 * @namespace flows4.controller
 */
export default class Login extends BaseController {

    private static readonly CURRENT_USER_STORAGE_KEY = "currentUser";
    private static readonly ENVIROMENT_STORAGE_KEY = "enviroment";

    private getMainModel(): MainModel | undefined {
        const self = this as unknown as {
            getOwnerComponent?: () => { getModel: () => unknown } | undefined;
            getView?: () => { getModel: () => unknown } | undefined;
        };

        const ownerModel = self.getOwnerComponent?.()?.getModel();
        if (ownerModel) {
            return ownerModel as MainModel;
        }

        const viewModel = self.getView?.()?.getModel();
        return viewModel as MainModel | undefined;
    }

    private getCurrentUserModel(): { setData: (data: Record<string, unknown>) => void } | undefined {
        const self = this as unknown as {
            getOwnerComponent?: () => { getModel: (name?: string) => unknown } | undefined;
        };

        const model = self.getOwnerComponent?.()?.getModel("CurrentUser");
        return model as { setData: (data: Record<string, unknown>) => void } | undefined;
    }

    private getEnviromentModel(): { setData: (data: EnviromentData) => void } | undefined {
        const self = this as unknown as {
            getOwnerComponent?: () => { getModel: (name?: string) => unknown } | undefined;
        };

        const model = self.getOwnerComponent?.()?.getModel("enviroment");
        return model as { setData: (data: EnviromentData) => void } | undefined;
    }

    private toCurrentUserData(user: B1User | undefined, fallbackLogin: string): B1User {
        if (user) {
            return user;
        }

        return {
            UserCode: fallbackLogin,
            UserName: fallbackLogin
        };
    }

    private async readUsersByFilter(mainModel: MainModel, filter: string): Promise<B1User[]> {
        if (!mainModel.read) {
            return [];
        }

        return new Promise<B1User[]>((resolve, reject) => {
            mainModel.read?.("/Users", {
                urlParameters: {
                    "$select": "InternalKey,UserCode,UserName,eMail,MobilePhoneNumber,Branch,Department,Superuser",
                    "$top": "1",
                    "$filter": filter
                },
                success: (data) => {
                    if (Array.isArray(data)) {
                        resolve(data);
                        return;
                    }

                    resolve(data?.results ?? []);
                },
                error: (error) => reject(error)
            });
        });
    }

    private async persistLoggedUser(mainModel: MainModel, login: string): Promise<void> {
        const escapedLogin = login.replace(/'/g, "''");
        const byUserCode = await this.readUsersByFilter(mainModel, `UserCode eq '${escapedLogin}'`);
        const byUserName = byUserCode.length > 0
            ? byUserCode
            : await this.readUsersByFilter(mainModel, `UserName eq '${escapedLogin}'`);

        const currentUserData = this.toCurrentUserData(byUserName[0], login);
        const currentUserModel = this.getCurrentUserModel();
        currentUserModel?.setData(currentUserData);
        window.sessionStorage.setItem(Login.CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUserData));
    }

    private persistEnviromentData(companydb: string, url: string, login: string): void {
        const enviromentData: EnviromentData = {
            companydb,
            url,
            login
        };

        const enviromentModel = this.getEnviromentModel();
        enviromentModel?.setData(enviromentData);
        window.sessionStorage.setItem(Login.ENVIROMENT_STORAGE_KEY, JSON.stringify(enviromentData));
    }

    public onInit(): void {
        const token = window.sessionStorage.getItem("b1ContextToken");
        if (token) {
            const oModel = this.getMainModel();
            oModel?.setHeaders?.({ "x-b1-context": token });
        }
    }

    public onChangeLogicalTransaction(): void {
        // Reserved for future dependent field updates when company changes.
    }

    public async onEntra(): Promise<void> {
        const oThis = this as unknown as {
            getView: () => {
                getModel: () => {
                    setHeaders?: (headers: Record<string, string>) => void;
                    callFunction?: (
                        path: string,
                        parameters: {
                            method: "POST" | "GET";
                            urlParameters: Record<string, string>;
                            success: (data: B1ContextActionResult | string | undefined) => void;
                            error: (error: unknown) => void;
                        }
                    ) => void;
                };
                byId: (id: string) => {
                    getSelectedItem: () => {
                        data: (key: string) => string | undefined;
                        getBindingContext: () => { getObject: () => unknown } | undefined;
                    } | null;
                    getValue: () => string;
                };
            };
        };

        const oView = oThis.getView();
        const oModel = this.getMainModel();

        if (!oModel) {
            MessageBox.error("Modelo OData não inicializado. Recarregue a tela.");
            return;
        }

        const oEmpresaCombo = oView.byId("dbo");
        const oUsuarioInput = oView.byId("Usuario");
        const oSenhaInput = oView.byId("Senha");

        const oSelectedItem = oEmpresaCombo.getSelectedItem();
        const oEmpresa = oSelectedItem?.getBindingContext()?.getObject() as Empresa | undefined;
        const sEmpresaUrl = oSelectedItem?.data("url") || oEmpresa?.url;
        const sEmpresaDb = oSelectedItem?.data("db") || oEmpresa?.db;
        const sUsuario = oUsuarioInput.getValue().trim();
        const sSenha = oSenhaInput.getValue();

        if (!sEmpresaUrl || !sEmpresaDb) {
            MessageBox.warning("Selecione uma empresa válida.");
            return;
        }

        if (!sUsuario || !sSenha) {
            MessageBox.warning("Informe usuário e senha para acessar o B1.");
            return;
        }

        try {
            if (!oModel.callFunction) {
                throw new Error("Modelo OData V2 não disponível para callFunction.");
            }

            const oResult = await new Promise<B1ContextActionResult | string | undefined>((resolve, reject) => {
                oModel.callFunction?.("/setB1Context", {
                    method: "POST",
                    urlParameters: {
                        url: sEmpresaUrl,
                        companydb: sEmpresaDb,
                        username: sUsuario,
                        password: sSenha
                    },
                    success: (data) => resolve(data),
                    error: (error) => reject(error)
                });
            });

            const sToken =
                typeof oResult === "string"
                    ? oResult
                    : oResult?.setB1Context || oResult?.value;

            if (!sToken) {
                throw new Error("Token de contexto não retornado pelo backend.");
            }

            oModel.setHeaders?.({ "x-b1-context": sToken });
            window.sessionStorage.setItem("b1ContextToken", sToken);
            this.persistEnviromentData(sEmpresaDb, sEmpresaUrl, sUsuario);

            try {
                await this.persistLoggedUser(oModel, sUsuario);
            } catch {
                // User profile enrichment should not block successful login.
            }

            this.getRouter().navTo("RouteHome");
        } catch (e) {
            const sMessage = e instanceof Error ? e.message : "Falha ao configurar conexão com B1.";
            MessageBox.error(sMessage);
        }
    }
}