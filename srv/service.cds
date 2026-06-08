using {flows4.db as db} from '../db/db';

@path: '/odata/v4/flows4'
service Flows4Service {
    entity Empresas           as projection on db.Empresas;
}