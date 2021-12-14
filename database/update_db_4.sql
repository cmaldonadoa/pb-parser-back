CREATE TABLE [ifc_bim].[filter_entity_excluded]
(
  [filter_id] INT NOT NULL,
  [entity_id] INT NOT NULL,
  PRIMARY KEY ([filter_id], [entity_id]),
  FOREIGN KEY ([filter_id]) REFERENCES [ifc_bim].[filter]([filter_id]) ON DELETE CASCADE,
  FOREIGN KEY ([entity_id]) REFERENCES [ifc_bim].[entity]([entity_id]) ON DELETE CASCADE
);

ALTER TABLE [ifc_bim].[tender]
ADD [upper_floors_coef] FLOAT NULL DEFAULT NULL;

ALTER TABLE [ifc_bim].[tender]
ADD [total_units] INT NULL DEFAULT NULL;

ALTER TABLE [ifc_bim].[tender]
ADD [parking_lots] INT NULL DEFAULT NULL;

ALTER TABLE [ifc_bim].[tender]
ADD [building_height] FLOAT NULL DEFAULT NULL;

ALTER TABLE [ifc_bim].[rule]
ADD [display] VARCHAR(500) NULL DEFAULT NULL;