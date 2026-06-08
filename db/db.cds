namespace flows4.db;

entity Empresas {
  key id   : UUID;
      url  : String(255);
      db   : String(255);
      name : String(255);
}