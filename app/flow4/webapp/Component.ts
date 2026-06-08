import UIComponent from "sap/ui/core/UIComponent";
import { createDeviceModel } from "./model/models";

/**
 * @namespace flow4
 */
export default UIComponent.extend("flow4.Component", {
    metadata: {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    },

    init(this: any): void {
        UIComponent.prototype.init.apply(this, arguments as any);

        this.setModel(createDeviceModel(), "device");

        this.getRouter().initialize();
    }
});