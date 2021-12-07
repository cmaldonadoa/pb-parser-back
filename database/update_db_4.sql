CREATE TABLE [ifc_bim].[filter_entity_excluded]
(
  [filter_id] INT NOT NULL,
  [entity_id] INT NOT NULL,
  PRIMARY KEY ([filter_id], [entity_id]),
  FOREIGN KEY ([filter_id]) REFERENCES [ifc_bim].[filter]([filter_id]) ON DELETE CASCADE,
  FOREIGN KEY ([entity_id]) REFERENCES [ifc_bim].[entity]([entity_id]) ON DELETE CASCADE
);