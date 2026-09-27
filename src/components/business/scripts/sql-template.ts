/** The SQL a new check starts from: a header block to fill in and a placeholder query. */
export function newCheckTemplate(today = new Date()): string {
  const created = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
  return `/*
Name: 
Description: 
Scope: 
Author: 
Created: ${created}
CN_Name: 
CN_Description: 
*/

-- 在此处编写SQL查询
SELECT 1 AS example;
`;
}
