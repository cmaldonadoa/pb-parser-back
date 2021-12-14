# Requisitos

Para la instalación y funcionamiento de las APIs, se requiere lo siguiente:

- NodeJS v16
- npm
- python3
- pip
- MySQL
- IfcOpenShell-python (http://ifcopenshell.org/python)

# Instalación

## Trimesh

La librería de python trimesh es utilizada para la detección de colisiones en el modelo. Para instalarla se requiere antes contar con openSCAD y blender en el sistema.

```
$ sudo apt install openscad blender
$ pip install trimesh[easy]
```

## Lark

Para el funcionamiento correcto de IfcOpenShell, es necesario contar con la librería de python Lark.

```
$ pip install lark
```

## Python-fcl

Para el funcionamiento correcto de Trimesh, es necesario contar con la librería python-fcl. La guía completa de instalación se encuentra en https://github.com/DmitryNeverov/python-fcl.

```
$ sudo apt-get install liboctomap-dev
$ sudo apt-get install libfcl-dev
$ pip install python-fcl
```

## Dependencias

Para instalar las dependencias de la API:

```
$ npm install
```

# Utilización

Es necesario crear una base de datos Microsoft SQL Server utilizando el archivo `database/create_db.sql`, y posteriormente los archivos `database/update_db_X.sql` en orden ascendente. Esto creará una base de datos llamada `ifc_bim` y todas las tablas necesarias para el funcionamiento de la API.

Luego, es necesario crear un archivo `.env` con las credenciales de la base de datos y el puerto a utilizar (usando como base el archivo `.env-template`).

```
DB_HOST= hostname para conectarse a la base de datos
DB_USER= usuario para conectarse a la base de datos
DB_PASSWORD= constraseña del usuario anterior
DB_SCHEMA= nombre de la base de datos
DB_PORT= puerto para conectarse a la base de datos
DB_DIALECT= dialecto utilizado en la base de datos (mssql)
PORT= puerto a usar por la API
JWT_KEY= llave privada para encriptar JWT
```

Finalmente, para correr la API:

```
$ npm start
```
