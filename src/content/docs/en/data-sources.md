# Data sources

A data source is a PostgreSQL database checks run against. `DATABASE_URL` is the built-in one, shown as **Primary**; admins can add more under **Data sources** in the sidebar, for example a replica per product or a separate analytics database. Every check runs against exactly one of them.

## Add a data source

1. Open **Data sources** and choose **Add data source**. Only admins can; everyone else sees the list without the buttons.
2. Give it a name. The ID is made from the name and can be changed until you save; checks refer to the source by it.
3. Paste a connection string in URL form: `postgres://user:password@host:5432/database?sslmode=require`.
4. Choose **Test connection**. Assay connects, reads once in a read-only transaction, and shows the PostgreSQL version and the role it connected as. If that role could write anywhere (a superuser, `pg_write_all_data`, write privileges on a table, or `CREATE` on the database), the result says so: checks only need `SELECT`, so give Assay a read-only role (see [SQL safety rules](/docs/sql-safety)).
5. **Save**. The connection string is stored encrypted and is never shown again, not even to admins; the list shows only `user@host:port/database`.

To change the connection later, open **Edit** from the row's menu and paste a new one; leave the field empty to keep the current one. **Test** on a row tests the saved connection and shows the result on the row.

## Use it in a check

When there is more than one source, the check editor (the new-check page and **Edit** in **Manage checks**) shows a **Data source** field. It decides where the check runs, and also which tables the template picker offers, and where the AI assistant looks for tables and dry-runs its draft. With only the built-in source the field stays hidden and every check uses it.

Moving a check to another source is an edit like any other: someone else's check goes to review, and the edit history records the change. A check's page names its source under the title, and **Coverage** has a source picker.

## Delete a data source

**Delete** in a row's menu removes a source that no check uses. While checks use it, Assay says how many; move them to another source first. The built-in source comes from the environment: change `DATABASE_URL` there.

## Rules for connection strings

- Only `postgres://` or `postgresql://` URLs, with the parameters `sslmode`, `channel_binding`, `application_name`, `options` and `connect_timeout`.
- **Hosts on private networks are refused**: 10.x, 172.16–31.x, 192.168.x, loopback, link-local (including the cloud metadata address) and names such as `localhost` or `*.internal`. Every connection checks the address again, so a name that later points somewhere private cannot connect. A self-hosted deployment whose databases sit on a private network sets `ALLOW_PRIVATE_DATA_SOURCES=true` ([Environment variables](/docs/environment-variables)).
- **TLS is verified** (certificate and host name) for public hosts, also when `sslmode` is missing. `sslmode=disable` is accepted only for a private host with private hosts allowed.
- The server needs `ASSAY_SECRET_KEY` to store sources, and scheduled runs from GitHub Actions need it too once a check uses an added source ([Scheduling](/docs/scheduling)).

## For agents

The MCP server's `list_data_sources` tool lists each source's id, name and engine, and `list_checks` and `get_check` say which source a check uses ([API keys and MCP](/docs/api-keys)).
