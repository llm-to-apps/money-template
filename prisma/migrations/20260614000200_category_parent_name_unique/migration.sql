DROP INDEX `Category_name_key` ON `Category`;

CREATE UNIQUE INDEX `Category_parentId_name_key` ON `Category`(`parentId`, `name`);
