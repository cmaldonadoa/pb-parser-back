CREATE DATABASE IF NOT EXISTS `ifc_bim` DEFAULT CHARACTER SET utf8;

/* Rule tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`group` (
  `group_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`group_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`model_type` (
  `model_type_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`model_type_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`rule` (
  `rule_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  `formula` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`rule_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`rule_group` (
  `rule_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  PRIMARY KEY (`rule_id`, `group_id`),
  FOREIGN KEY (`rule_id`) REFERENCES `ifc_bim`.`rule`(`rule_id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `ifc_bim`.`group`(`group_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`rule_model_type` (
  `rule_id` INT NOT NULL,
  `model_type_id` INT NOT NULL,
  PRIMARY KEY (`rule_id`, `model_type_id`),
  FOREIGN KEY (`rule_id`) REFERENCES `ifc_bim`.`rule`(`rule_id`) ON DELETE CASCADE,
  FOREIGN KEY (`model_type_id`) REFERENCES `ifc_bim`.`model_type`(`model_type_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

/* Filter tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`entity` (
  `entity_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`entity_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`space` (
  `space_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`space_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`filter` (
  `filter_id` INT NOT NULL AUTO_INCREMENT,
  `rule_id` INT NOT NULL,
  `index` INT NOT NULL,
  PRIMARY KEY (`filter_id`),
  FOREIGN KEY (`rule_id`) REFERENCES `ifc_bim`.`rule`(`rule_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`filter_entity` (
  `filter_id` INT NOT NULL,
  `entity_id` INT NOT NULL,
  PRIMARY KEY (`filter_id`, `entity_id`),
  FOREIGN KEY (`filter_id`) REFERENCES `ifc_bim`.`filter`(`filter_id`) ON DELETE CASCADE,
  FOREIGN KEY (`entity_id`) REFERENCES `ifc_bim`.`entity`(`entity_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`filter_space` (
  `filter_id` INT NOT NULL,
  `space_id` INT NOT NULL,
  PRIMARY KEY (`filter_id`, `space_id`),
  FOREIGN KEY (`filter_id`) REFERENCES `ifc_bim`.`filter`(`filter_id`) ON DELETE CASCADE,
  FOREIGN KEY (`space_id`) REFERENCES `ifc_bim`.`space`(`space_id`) ON DELETE CASCADE,
) ENGINE = InnoDB;

/* Constraint tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`operation` (
  `operation_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`operation_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`on` (
  `on_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`on_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`constraint` (
  `constraint_id` INT NOT NULL AUTO_INCREMENT,
  `operation_id` INT NOT NULL,
  `on_id` INT NOT NULL,
  `filter_id` INT NOT NULL,
  `attribute` VARCHAR(128) NOT NULL,
  `index` INT NOT NULL,
  PRIMARY KEY (`constraint_id`),
  FOREIGN KEY (`operation_id`) REFERENCES `ifc_bim`.`operation`(`operation_id`) ON DELETE CASCADE,
  FOREIGN KEY (`on_id`) REFERENCES `ifc_bim`.`on`(`on_id`) ON DELETE CASCADE,
  FOREIGN KEY (`filter_id`) REFERENCES `ifc_bim`.`filter`(`filter_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`expected_value` (
  `expected_value_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  `value` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`expected_value_id`),
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`pset_constraint` (
  `pset_constraint_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  `name_regexp` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`pset_constraint_id`),
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`location_constraint` (
  `location_constraint_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  PRIMARY KEY (`location_constraint_id`),
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`attribute_constraint` (
  `attribute_constraint_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  PRIMARY KEY (`attribute_constraint_id`),
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

/* File tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`file` (
  `file_id` INT NOT NULL AUTO_INCREMENT,
  `model_type_id` INT NOT NULL,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  `upload_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`),
  FOREIGN KEY (`model_type_id`) REFERENCES `ifc_bim`.`model_type`(`model_type_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`file_metadata` (
  `file_metadata_id` INT NOT NULL AUTO_INCREMENT,
  `file_id` INT NOT NULL,
  `constraint_id` INT NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `ifc_guid` VARCHAR(22) NOT NULL,
  PRIMARY KEY (`file_metadata_id`),
  FOREIGN KEY (`file_id`) REFERENCES `ifc_bim`.`file`(`file_id`) ON DELETE CASCADE,
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

/* Tender tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`building_type` (
  `building_type_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`building_type_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`region` (
  `region_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`region_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`commune` (
  `commune_id` INT NOT NULL AUTO_INCREMENT,
  `region_id` INT NOT NULL,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`commune_id`),
  FOREIGN KEY (`region_id`) REFERENCES `ifc_bim`.`region`(`region_id`) ON DELETE CASCADE,
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`tender` (
  `tender_id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`tender_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`tender_group` (
  `tender_id` INT NOT NULL,
  `group_id` INT NOT NULL,
  PRIMARY KEY (`tender_id`, `group_id`),
  FOREIGN KEY (`tender_id`) REFERENCES `ifc_bim`.`tender`(`tender_id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `ifc_bim`.`group`(`group_id`) ON DELETE CASCADE,
) ENGINE = InnoDB;

/* User tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`role` (
  `role_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`role_id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`user` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `region_id` INT NULL DEFAULT NULL,
  `username` VARCHAR(128) NOT NULL UNIQUE,
  `password` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`role_id`),
  FOREIGN KEY (`region_id`) REFERENCES `ifc_bim`.`region`(`region_id`) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ifc_bim`.`user_role` (
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `ifc_bim`.`user`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `ifc_bim`.`role`(`role_id`) ON DELETE CASCADE,
) ENGINE = InnoDB;

/* Constants */
INSERT INTO
  `ifc_bim`.`operation`(`name`)
VALUES
  ("EQUAL"),
  ("NOT_EQUAL"),
  ("GREATER"),
  ("GREATER_EQUAL"),
  ("LESSER"),
  ("LESSER_EQUAL"),
  ("EXISTS"),
  ("NOT_EXISTS");

INSERT INTO
  `ifc_bim`.`on`(`name`)
VALUES
  ("ENTITY"),
  ("TYPE");

INSERT INTO
  `ifc_bim`.`model_type`(`name`)
VALUES
  ("ARQUITECTURA"),
  ("SITIO"),
  ("VOLUMETRICO");

INSERT INTO
  `ifc_bim`.`region`(`name`)
VALUES
  ("XV - Región de Arica y Parinacota"),
  ("I - Región de Tarapacá"),
  ("II - Región de Antofagasta"),
  ("III - Región de Atacama"),
  ("IV - Región de Coquimbo"),
  ("V - Región de Valparaíso"),
  ("XIII - Región Metropolitana de Santiago"),
  (
    "VI - Región del Libertador Gral. Bernardo O'Higgins"
  ),
  ("VII - Región del Maule"),
  ("XVI - Ñuble"),
  ("VIII - Región del Biobío"),
  ("IX - Región de la Araucanía"),
  ("XIV - Región de los Ríos"),
  ("X - Región de los Lagos"),
  (
    "XI - Región de Aysén del Gral. Carlos Ibáñez del Campo"
  ),
  (
    "XII - Región de Magallanes y de la Antártica Chilena"
  );

INSERT INTO
  `ifc_bim`.`commune`(`region_id`, `name`)
VALUES
  (1, "Arica"),
  (1, "Camarones"),
  (1, "General Lagos"),
  (1, "Putre"),
  (2, "Alto Hospicio"),
  (2, "Camiña"),
  (2, "Colchane"),
  (2, "Huara"),
  (2, "Iquique"),
  (2, "Pica"),
  (2, "Pozo Almonte"),
  (3, "Antofagasta"),
  (3, "Calama"),
  (3, "María Elena"),
  (3, "Mejillones"),
  (3, "Ollagüe"),
  (3, "San Pedro de Atacama"),
  (3, "Sierra Gorda"),
  (3, "Taltal"),
  (3, "Tocopilla"),
  (4, "Alto del Carmen"),
  (4, "Caldera"),
  (4, "Chañaral"),
  (4, "Copiapó"),
  (4, "Diego de Almagro"),
  (4, "Freirina"),
  (4, "Huasco"),
  (4, "Tierra Amarilla"),
  (4, "Vallenar"),
  (5, "Andacollo"),
  (5, "Canela"),
  (5, "Combarbalá"),
  (5, "Coquimbo"),
  (5, "Illapel"),
  (5, "La Higuera"),
  (5, "La Serena"),
  (5, "Los Vilos"),
  (5, "Monte Patria"),
  (5, "Ovalle"),
  (5, "Paiguano"),
  (5, "Punitaqui"),
  (5, "Río Hurtado"),
  (5, "Salamanca"),
  (5, "Vicuña"),
  (6, "Algarrobo"),
  (6, "Cabildo"),
  (6, "Calera"),
  (6, "Calle Larga"),
  (6, "Cartagena"),
  (6, "Casablanca"),
  (6, "Catemu"),
  (6, "Concón"),
  (6, "El Quisco"),
  (6, "El Tabo"),
  (6, "Hijuelas"),
  (6, "Isla de Pascua"),
  (6, "Juan Fernández"),
  (6, "La Cruz"),
  (6, "La Ligua"),
  (6, "Limache"),
  (6, "Llaillay"),
  (6, "Los Andes"),
  (6, "Nogales"),
  (6, "Olmué"),
  (6, "Panquehue"),
  (6, "Papudo"),
  (6, "Petorca"),
  (6, "Puchuncaví"),
  (6, "Putaendo"),
  (6, "Quillota"),
  (6, "Quilpué"),
  (6, "Quintero"),
  (6, "Rinconada"),
  (6, "San Antonio"),
  (6, "San Esteban"),
  (6, "San Felipe"),
  (6, "Santa María"),
  (6, "Santo Domingo"),
  (6, "Valparaíso"),
  (6, "Villa Alemana"),
  (6, "Viña del Mar"),
  (6, "Zapallar"),
  (7, "Alhué"),
  (7, "Buin"),
  (7, "Calera de Tango"),
  (7, "Cerrillos"),
  (7, "Cerro Navia"),
  (7, "Colina"),
  (7, "Conchalí"),
  (7, "Curacaví"),
  (7, "El Bosque"),
  (7, "El Monte"),
  (7, "Estación Central"),
  (7, "Huechuraba"),
  (7, "Independencia"),
  (7, "Isla de Maipo"),
  (7, "La Cisterna"),
  (7, "La Florida"),
  (7, "La Granja"),
  (7, "La Pintana"),
  (7, "La Reina"),
  (7, "Lampa"),
  (7, "Las Condes"),
  (7, "Lo Barnechea"),
  (7, "Lo Espejo"),
  (7, "Lo Prado"),
  (7, "Macul"),
  (7, "Maipú"),
  (7, "María Pinto"),
  (7, "Melipilla"),
  (7, "Ñuñoa"),
  (7, "Padre Hurtado"),
  (7, "Paine"),
  (7, "Pedro Aguirre Cerda"),
  (7, "Peñaflor"),
  (7, "Peñalolén"),
  (7, "Pirque"),
  (7, "Providencia"),
  (7, "Pudahuel"),
  (7, "Puente Alto"),
  (7, "Quilicura"),
  (7, "Quinta Normal"),
  (7, "Recoleta"),
  (7, "Renca"),
  (7, "San Bernardo"),
  (7, "San Joaquín"),
  (7, "San José de Maipo"),
  (7, "San Miguel"),
  (7, "San Pedro"),
  (7, "San Ramón"),
  (7, "Santiago Centro"),
  (7, "Talagante"),
  (7, "Tiltil"),
  (7, "Vitacura"),
  (8, "Chépica"),
  (8, "Chimbarongo"),
  (8, "Codegua"),
  (8, "Coinco"),
  (8, "Coltauco"),
  (8, "Doñihue"),
  (8, "Graneros"),
  (8, "La Estrella"),
  (8, "Las Cabras"),
  (8, "Litueche"),
  (8, "Lolol"),
  (8, "Machalí"),
  (8, "Malloa"),
  (8, "Marchihue"),
  (8, "Mostazal"),
  (8, "Nancagua"),
  (8, "Navidad"),
  (8, "Olivar"),
  (8, "Palmilla"),
  (8, "Paredones"),
  (8, "Peralillo"),
  (8, "Peumo"),
  (8, "Pichidegua"),
  (8, "Pichilemu"),
  (8, "Placilla"),
  (8, "Pumanque"),
  (8, "Quinta de Tilcoco"),
  (8, "Rancagua"),
  (8, "Rengo"),
  (8, "Requínoa"),
  (8, "San Fernando"),
  (8, "San Vicente"),
  (8, "Santa Cruz"),
  (9, "Cauquenes"),
  (9, "Chanco"),
  (9, "Colbún"),
  (9, "Constitución"),
  (9, "Curepto"),
  (9, "Curicó"),
  (9, "Empedrado"),
  (9, "Hualañé"),
  (9, "Licantén"),
  (9, "Linares"),
  (9, "Longaví"),
  (9, "Maule"),
  (9, "Molina"),
  (9, "Parral"),
  (9, "Pelarco"),
  (9, "Pelluhue"),
  (9, "Pencahue"),
  (9, "Rauco"),
  (9, "Retiro"),
  (9, "Río Claro"),
  (9, "Romeral"),
  (9, "Sagrada Familia"),
  (9, "San Clemente"),
  (9, "San Javier"),
  (9, "San Rafael"),
  (9, "Talca"),
  (9, "Teno"),
  (9, "Vichuquén"),
  (9, "Villa Alegre"),
  (9, "Yerbas Buenas"),
  (10, "Bulnes"),
  (10, "Chillán"),
  (10, "Chillán Viejo"),
  (10, "Cobquecura"),
  (10, "Coelemu"),
  (10, "Coihueco"),
  (10, "El Carmen"),
  (10, "Ninhue"),
  (10, "Ñiquén"),
  (10, "Pemuco"),
  (10, "Pinto"),
  (10, "Portezuelo"),
  (10, "Quillón"),
  (10, "Quirihue"),
  (10, "Ránquil"),
  (10, "San Carlos"),
  (10, "San Fabián"),
  (10, "San Ignacio"),
  (10, "San Nicolás"),
  (10, "Treguaco"),
  (10, "Yungay"),
  (11, "Alto Biobío"),
  (11, "Antuco"),
  (11, "Arauco"),
  (11, "Cabrero"),
  (11, "Cañete"),
  (11, "Chiguayante"),
  (11, "Concepción"),
  (11, "Contulmo"),
  (11, "Coronel"),
  (11, "Curanilahue"),
  (11, "Florida"),
  (11, "Hualpén"),
  (11, "Hualqui"),
  (11, "Laja"),
  (11, "Lebu"),
  (11, "Los Álamos"),
  (11, "Los Ángeles"),
  (11, "Lota"),
  (11, "Mulchén"),
  (11, "Nacimiento"),
  (11, "Negrete"),
  (11, "Penco"),
  (11, "Quilaco"),
  (11, "Quilleco"),
  (11, "San Pedro de la Paz"),
  (11, "San Rosendo"),
  (11, "Santa Bárbara"),
  (11, "Santa Juana"),
  (11, "Talcahuano"),
  (11, "Tirúa"),
  (11, "Tomé"),
  (11, "Tucapel"),
  (11, "Yumbel"),
  (12, "Angol"),
  (12, "Carahue"),
  (12, "Cholchol"),
  (12, "Collipulli"),
  (12, "Cunco"),
  (12, "Curacautín"),
  (12, "Curarrehue"),
  (12, "Ercilla"),
  (12, "Freire"),
  (12, "Galvarino"),
  (12, "Gorbea"),
  (12, "Lautaro"),
  (12, "Loncoche"),
  (12, "Lonquimay"),
  (12, "Los Sauces"),
  (12, "Lumaco"),
  (12, "Melipeuco"),
  (12, "Nueva Imperial"),
  (12, "Padre las Casas"),
  (12, "Perquenco"),
  (12, "Pitrufquén"),
  (12, "Pucón"),
  (12, "Purén"),
  (12, "Renaico"),
  (12, "Saavedra"),
  (12, "Temuco"),
  (12, "Teodoro Schmidt"),
  (12, "Toltén"),
  (12, "Traiguén"),
  (12, "Victoria"),
  (12, "Vilcún"),
  (12, "Villarrica"),
  (13, "Corral"),
  (13, "Futrono"),
  (13, "La Unión"),
  (13, "Lago Ranco"),
  (13, "Lanco"),
  (13, "Los Lagos"),
  (13, "Máfil"),
  (13, "Mariquina"),
  (13, "Paillaco"),
  (13, "Panguipulli"),
  (13, "Río Bueno"),
  (13, "Valdivia"),
  (14, "Ancud"),
  (14, "Calbuco"),
  (14, "Castro"),
  (14, "Chaitén"),
  (14, "Chonchi"),
  (14, "Cochamó"),
  (14, "Curaco de Vélez"),
  (14, "Dalcahue"),
  (14, "Fresia"),
  (14, "Frutillar"),
  (14, "Futaleufú"),
  (14, "Hualaihué"),
  (14, "Llanquihue"),
  (14, "Los Muermos"),
  (14, "Maullín"),
  (14, "Osorno"),
  (14, "Palena"),
  (14, "Puerto Montt"),
  (14, "Puerto Octay"),
  (14, "Puerto Varas"),
  (14, "Puqueldón"),
  (14, "Purranque"),
  (14, "Puyehue"),
  (14, "Queilén"),
  (14, "Quellón"),
  (14, "Quemchi"),
  (14, "Quinchao"),
  (14, "Río Negro"),
  (14, "San Juan de la Costa"),
  (14, "San Pablo"),
  (15, "Aysén"),
  (15, "Chile Chico"),
  (15, "Cisnes"),
  (15, "Cochrane"),
  (15, "Coihaique"),
  (15, "Guaitecas"),
  (15, "Lago Verde"),
  (15, "O’Higgins"),
  (15, "Río Ibáñez"),
  (15, "Tortel"),
  (16, "Antártica"),
  (16, "Cabo de Hornos"),
  (16, "Laguna Blanca"),
  (16, "Natales"),
  (16, "Porvenir"),
  (16, "Primavera"),
  (16, "Punta Arenas"),
  (16, "Río Verde"),
  (16, "San Gregorio"),
  (16, "Timaukel"),
  (16, "Torres del Paine");