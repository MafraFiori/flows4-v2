import Controller from "sap/ui/core/mvc/Controller";
import AppComponent from "../../Component";
import UIComponent from "sap/ui/core/UIComponent";
import Router from "sap/ui/core/routing/Router";




export default abstract class BaseController extends Controller {

    public getRouter(): Router {
		return UIComponent.getRouterFor(this);
	}

	public navTo(routeName: string, parameters?: Record<string, string>, replace?: boolean): void {
		this.getRouter().navTo(routeName, parameters, replace);
	}

	public onHomePress(): void {
		this.navTo("RouteHome");
	}

}