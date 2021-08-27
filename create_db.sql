CREATE DATABASE IF NOT EXISTS `ifc_bim` DEFAULT CHARACTER SET utf8;
/* Rule tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`group` (
  `group_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`group_id`)
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
/* Filter tables */
CREATE TABLE IF NOT EXISTS `ifc_bim`.`entity` (
  `entity_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL UNIQUE,
  PRIMARY KEY (`entity_id`)
) ENGINE = InnoDB;
CREATE TABLE IF NOT EXISTS `ifc_bim`.`filter` (
  `filter_id` INT NOT NULL AUTO_INCREMENT,
  `rule_id` INT NOT NULL,
  `space_name` VARCHAR(128) NULL DEFAULT NULL,
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
CREATE TABLE IF NOT EXISTS `ifc_bim`.`expected_value_int` (
  `expected_value_int_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  `value` INT NOT NULL,
  PRIMARY KEY (`expected_value_int_id`),
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;
CREATE TABLE IF NOT EXISTS `ifc_bim`.`expected_value_float` (
  `expected_value_float_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  `value` FLOAT NOT NULL,
  PRIMARY KEY (`expected_value_float_id`),
  FOREIGN KEY (`constraint_id`) REFERENCES `ifc_bim`.`constraint`(`constraint_id`) ON DELETE CASCADE
) ENGINE = InnoDB;
CREATE TABLE IF NOT EXISTS `ifc_bim`.`expected_value_string` (
  `expected_value_string_id` INT NOT NULL AUTO_INCREMENT,
  `constraint_id` INT NOT NULL,
  `value` VARCHAR(128) NOT NULL,
  PRIMARY KEY (`expected_value_string_id`),
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
  `name` VARCHAR(128) NOT NULL UNIQUE,
  `upload_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`)
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
/* Constants */
INSERT INTO `ifc_bim`.`operation`(`name`)
VALUES ("EQUAL"),
  ("NOT_EQUAL"),
  ("GREATER"),
  ("GREATER_EQUAL"),
  ("LESSER"),
  ("LESSER_EQUAL"),
  ("EXISTS"),
  ("NOT_EXISTS");
INSERT INTO `ifc_bim`.`on`(`name`)
VALUES ("ENTITY"),
  ("TYPE");