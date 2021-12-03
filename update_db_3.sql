CREATE TABLE [ifc_bim].[file_element]
(
  [file_element_id] INT NOT NULL IDENTITY,
  [file_id] INT NOT NULL,
  [type] VARCHAR(128) NOT NULL,
  [guid] VARCHAR(128) NOT NULL,
  [x] FLOAT NOT NULL,
  [y] FLOAT NOT NULL,
  [z] FLOAT NOT NULL,
  FOREIGN KEY ([file_id]) REFERENCES [ifc_bim].[file]([file_id]) ON DELETE NO ACTION,
  UNIQUE NONCLUSTERED ([file_id], [guid]) WITH (IGNORE_DUP_KEY = ON),
  PRIMARY KEY ([file_element_id])
);

CREATE TABLE [ifc_bim].[intersection]
(
  [intersection_id] INT NOT NULL IDENTITY,
  [file_element_id_1] INT NOT NULL,
  [file_element_id_2] INT NOT NULL,
  [is_duplicate] BIT NOT NULL DEFAULT 0,
  FOREIGN KEY ([file_element_id_1]) REFERENCES [ifc_bim].[file_element]([file_element_id]) ON DELETE NO ACTION,
  FOREIGN KEY ([file_element_id_2]) REFERENCES [ifc_bim].[file_element]([file_element_id]) ON DELETE NO ACTION,
  UNIQUE NONCLUSTERED ([file_element_id_1], [file_element_id_2]) WITH (IGNORE_DUP_KEY = ON),
  PRIMARY KEY ([intersection_id])
);

ALTER TABLE [ifc_bim].[file]
ADD [is_valid] BIT NOT NULL DEFAULT 0;

GO

CREATE TRIGGER [ifc_bim].[trg_delete_CASCADE_ifc_intersection]
ON [ifc_bim].[file_element] INSTEAD OF DELETE 
AS 
BEGIN
  SET NOCOUNT ON
  DELETE FROM [ifc_bim].[intersection] WHERE [file_element_id_1] IN (SELECT [file_element_id]
  FROM DELETED);
  DELETE FROM [ifc_bim].[intersection] WHERE [file_element_id_2] IN (SELECT [file_element_id]
  FROM DELETED);
  DELETE FROM [ifc_bim].[file_element] WHERE [file_element_id] IN (SELECT [file_element_id]
  FROM DELETED);
END;