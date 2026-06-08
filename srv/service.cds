using { b1 } from './external/b1';
using { flows4.db as db } from '../db/db';

@path: '/flows4'
@title: '{i18n>flow4ServiceTitle}'
service Flow4Service {
    action setB1Context(url: String, companydb: String, username: String, password: String) returns String;

    entity Items as projection on  b1.Items {
        ItemCode,
        ItemName
    }

    entity Empresas as projection on db.Empresas
}