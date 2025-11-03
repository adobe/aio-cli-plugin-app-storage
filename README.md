# aio-cli-plugin-app-storage

The CLI Plugin to manage your App Builder State storage and Database services.

If you need to access State programmatically, check the
[@adobe/aio-lib-state](https://github.com/adobe/aio-lib-state) library.

If you need to access Database programmatically, check the
[@adobe/aio-lib-db](https://github.com/adobe/aio-lib-db) library.

---
<!-- toc -->
* [aio-cli-plugin-app-storage](#aio-cli-plugin-app-storage)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

```sh-session
$ aio plugins:install @adobe/aio-cli-plugin-app-storage
$ # OR
$ aio discover -i
$ aio app state --help
$ aio app db --help
```

# Commands
<!-- commands -->
## State Storage Commands
* [`aio app state delete [KEYS]`](#aio-app-state-delete-keys)
* [`aio app state get KEY`](#aio-app-state-get-key)
* [`aio app state list`](#aio-app-state-list)
* [`aio app state put KEY VALUE`](#aio-app-state-put-key-value)
* [`aio app state stats`](#aio-app-state-stats)

## Database Commands
### Collection Management
* [`aio app db collection list`](#aio-app-db-collection-list)
* [`aio app db collection create COLLECTION`](#aio-app-db-collection-create-collection)
* [`aio app db collection drop COLLECTION`](#aio-app-db-collection-drop-collection)
* [`aio app db collection rename CURRENTNAME NEWNAME`](#aio-app-db-collection-rename-currentname-newname)
* [`aio app db collection stats COLLECTION`](#aio-app-db-collection-stats-collection)

### Document Operations
* [`aio app db document insert COLLECTION DOCUMENTS`](#aio-app-db-document-insert-collection-documents)
* [`aio app db document delete COLLECTION FILTER`](#aio-app-db-document-delete-collection-filter)
* [`aio app db document find COLLECTION FILTER`](#aio-app-db-document-find-collection-filter)
* [`aio app db document update COLLECTION FILTER UPDATE`](#aio-app-db-document-update-collection-filter-update)
* [`aio app db document replace COLLECTION FILTER REPLACEMENT`](#aio-app-db-document-replace-collection-filter-replacement)
* [`aio app db document count COLLECTION`](#aio-app-db-document-count-collection)

### Index Management
* [`aio app db index create COLLECTION`](#aio-app-db-index-create-collection)
* [`aio app db index drop COLLECTION INDEXNAME`](#aio-app-db-index-drop-collection-indexname)
* [`aio app db index list COLLECTION`](#aio-app-db-index-list-collection)

### Database Management
* [`aio app db ping`](#aio-app-db-ping)
* [`aio app db provision`](#aio-app-db-provision)
* [`aio app db delete`](#aio-app-db-delete)
* [`aio app db status`](#aio-app-db-status)
* [`aio app db stats`](#aio-app-db-stats)
* `aio app db show collections` - Alias for [`aio app db collection list`](#aio-app-db-collection-list)

## Other Commands
* [`aio help [COMMAND]`](#aio-help-command)

# State Storage Commands

## `aio app state delete [KEYS]`

Delete key-values

```
USAGE
  $ aio app state delete [KEYS...] [--json] [--region amer|emea|apac] [--match <value>] [--force]

ARGUMENTS
  KEYS...  keys to delete. Above 5 keys, you will be prompted for confirmation

FLAGS
  --force            [use with caution!] force delete, no safety prompt
  --match=<value>    [use with caution!] deletes ALL key-values matching the provided glob-like pattern
  --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                     <options: amer|emea|apac>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Delete key-values

ALIASES
  $ aio app state del
  $ aio app state remove
  $ aio app state rm

EXAMPLES
  $ aio app state delete key

  $ aio app state delete key1 key2 key3

  $ aio app state delete --match 'gl*b'

  $ aio app state delete --match 'gl*b' --json

  $ aio app state delete --match 'be-carreful*' --force
```

## `aio app state get KEY`

Get a key-value

```
USAGE
  $ aio app state get KEY [--json] [--region amer|emea|apac]

ARGUMENTS
  KEY  State key

FLAGS
  --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                     <options: amer|emea|apac>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get a key-value

EXAMPLES
  $ aio app state get key

  $ aio app state get key --json

  $ aio app state get key | wc -c
```

## `aio app state list`

List key-values

```
USAGE
  $ aio app state list [--json] [--region amer|emea|apac] [-m <value>]

FLAGS
  -m, --match=<value>    [default: *] Glob-like pattern to filter keys
      --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                         <options: amer|emea|apac>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List key-values

ALIASES
  $ aio app state ls

EXAMPLES
  $ aio app state list

  $ aio app state list --match 'gl*b'

  $ aio app state list --json

  $ aio app state list | less

  $ aio app state list | wc -l
```

## `aio app state put KEY VALUE`

Put a key-value

```
USAGE
  $ aio app state put KEY VALUE [--json] [--region amer|emea|apac] [-t <value>]

ARGUMENTS
  KEY    State key
  VALUE  State value

FLAGS
  -t, --ttl=<value>      Time to live in seconds. Default is 86400 (24 hours), max is 31536000 (1 year).
      --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                         <options: amer|emea|apac>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Put a key-value

EXAMPLES
  $ aio app state put key value

  $ aio app state put key value --ttl 3600

  $ aio app state put key value --json

  $ cat value/from/file | xargs -0 ./bin/run.js app state put key
```

## `aio app state stats`

Display stats

```
USAGE
  $ aio app state stats [--json] [--region amer|emea|apac]

FLAGS
  --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                     <options: amer|emea|apac>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Display stats

EXAMPLES
  $ aio app state stats

  $ aio app state stats --json
```

# Database Commands

## Collection Management

> Note: The commands under `aio app db collection <command>` are also available as `aio app db col <command>` shorthand aliases.

### `aio app db collection list`

Get the list of collections in your App Builder database

```
USAGE
  $ aio app db collection list [--json] [--region <value>] [-i]

FLAGS
  -i, --info  Show detailed collection information instead of just names

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Get the list of collections in your App Builder database

ALIASES
  $ aio app db col list
  $ aio app db show collections

EXAMPLES
  $ aio app db collection list

  $ aio app db collection list --info

  $ aio app db collection list --json

  $ aio app db col list --info --json
```

### `aio app db collection create COLLECTION`

Create a new collection in the database

```
USAGE
  $ aio app db collection create COLLECTION [--json] [--region <value>] [-v <value>]

ARGUMENTS
  COLLECTION  The name of the collection to create

FLAGS
  -v, --validator=<value>  JSON schema validator for document validation (JSON string)

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Create a new collection in the database

ALIASES
  $ aio app db col create

EXAMPLES
  $ aio app db collection create users

  $ aio app db collection create inventory --validator '{"type": "object", "required": ["id", "quantity"]}' --json

  $ aio app db col create products --json

  $ aio app db col create products --validator '{"type": "object", "properties": {"name": {"type": "string"}, "price": {"type": "number", "minimum": 0}}, "required": ["name", "price"]}'
```

### `aio app db collection drop COLLECTION`

Drop a collection from the database

```
USAGE
  $ aio app db collection drop COLLECTION [--json] [--region <value>]

ARGUMENTS
  COLLECTION  The name of the collection to drop

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Drop a collection from the database

ALIASES
  $ aio app db col drop

EXAMPLES
  $ aio app db collection drop users

  $ aio app db collection drop products --json

  $ aio app db col drop inventory
```

### `aio app db collection rename CURRENTNAME NEWNAME`

Rename a collection in the database

```
USAGE
  $ aio app db collection rename CURRENTNAME NEWNAME [--json] [--region <value>]

ARGUMENTS
  CURRENTNAME  The current name of the collection to rename
  NEWNAME      The new name for the collection

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Rename a collection in the database

ALIASES
  $ aio app db col rename

EXAMPLES
  $ aio app db collection rename users customers

  $ aio app db collection rename old_products new_products --json

  $ aio app db col rename inventory stock
```

### `aio app db collection stats COLLECTION`

Get statistics for a collection in the database

```
USAGE
  $ aio app db collection stats COLLECTION [--json] [--region <value>]

ARGUMENTS
  COLLECTION  The name of the collection to get stats for

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Get statistics for a collection in the database

ALIASES
  $ aio app db col stats

EXAMPLES
  $ aio app db collection stats users

  $ aio app db collection stats products --json

  $ aio app db col stats inventory
```

## Document Operations

> Note: The commands under `aio app db document <command>` are also available as `aio app db doc <command>` shorthand aliases.

### `aio app db document insert COLLECTION DOCUMENTS`

Insert one or more documents into a collection

```
USAGE
  $ aio app db document insert COLLECTION DOCUMENTS [--json] [--region <value>] [-b]

ARGUMENTS
  COLLECTION  The name of the collection to insert documents into
  DOCUMENTS   JSON object or array of documents to insert

FLAGS
  -b, --bypassDocumentValidation  Bypass schema validation if present

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Insert one or more documents into a collection

ALIASES
  $ aio app db doc insert

EXAMPLES
  $ aio app db document insert users '{"name": "John", "age": 30}'

  $ aio app db document insert products '[{"id": 1, "name": "Product A"}, {"id": 2, "name": "Product B"}]' --json

  $ aio app db document insert temp '{"data": "test"}' --bypassDocumentValidation

  $ aio app db doc insert bulk '[{"field": "foo"}, {"field": "bar"}]' --bypassDocumentValidation --json
```

### `aio app db document delete COLLECTION FILTER`

Delete a single document from a collection

```
USAGE
  $ aio app db document delete COLLECTION FILTER [--json] [--region <value>]

ARGUMENTS
  COLLECTION  The name of the collection
  FILTER      The filter document (JSON string)

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Delete a single document from a collection

ALIASES
  $ aio app db doc delete

EXAMPLES
  $ aio app db document delete users '{"name": "John"}'

  $ aio app db document delete products '{"id": "123"}' --json

  $ aio app db doc delete posts '{"status": "draft"}'
```

### `aio app db document find COLLECTION FILTER`

Find documents in a collection based on filter criteria.

```
USAGE
  $ aio app db document find COLLECTION FILTER [--json] [--region <value>] [-l <value>] [-s <value>] [-o <value>] [-p <value>]

ARGUMENTS
  COLLECTION  The name of the collection
  FILTER      Filter criteria for the documents to find (JSON string, e.g. '{"status": "active"}')

FLAGS
  -l, --limit=<value>       [default: 20] Limit the number of documents returned, max: 100
  -o, --sort=<value>        Sort specification as a JSON object (e.g. '{"field": 1}')
  -p, --projection=<value>  Projection specification as a JSON object (e.g. '{"field1": 1, "field2": 0}')
  -s, --skip=<value>        Skip the first N documents

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Find documents in a collection based on filter criteria.

ALIASES
  $ aio app db doc find

EXAMPLES
  $ aio app db document find users '{}'

  $ aio app db document find products '{"category": "Computer Accessories"}' --json

  $ aio app db document find products '{"name": {"$regex": "Speakers$"}}' --sort '{"price": -1}' --limit 10 --skip 5 --projection '{"name": 1, "price": 1}'

  $ aio app db doc find orders '{"status": "pending"}' --sort '{"orderDate": -1}'
```

### `aio app db document update COLLECTION FILTER UPDATE`

Update document(s) in a collection

```
USAGE
  $ aio app db document update COLLECTION FILTER UPDATE [--json] [--region <value>] [-u] [-m]

ARGUMENTS
  COLLECTION  The name of the collection
  FILTER      The filter document (JSON string)
  UPDATE      The update document (JSON string)

FLAGS
  -m, --many    Update all documents matching the filter. Without this option, only the first matching document is updated.
  -u, --upsert  If no document is found, create a new one

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Update document(s) in a collection

ALIASES
  $ aio app db doc update

EXAMPLES
  $ aio app db document update users '{"name": "John"}' '{"$set": {"age": 31}}'

  $ aio app db document update products '{"id": "123"}' '{"$inc": {"stock": -1}}' --json

  $ aio app db document update posts '{"slug": "hello-world"}' '{"$set": {"status": "published"}}' --many

  $ aio app db doc update users '{"email": "john@example.com"}' '{"$set": {"lastLogin": "2024-01-01"}}' --upsert
```

### `aio app db document replace COLLECTION FILTER REPLACEMENT`

Replace a single document in a collection

```
USAGE
  $ aio app db document replace COLLECTION FILTER REPLACEMENT [--json] [--region <value>] [-u]

ARGUMENTS
  COLLECTION   The name of the collection
  FILTER       The filter document (JSON string)
  REPLACEMENT  The replacement document (JSON string)

FLAGS
  -u, --upsert  If no document is found, create a new one

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Replace a single document in a collection

ALIASES
  $ aio app db doc replace

EXAMPLES
  $ aio app db document replace users '{"name": "John"}' '{"name": "John Doe", "age": 30, "status": "active"}'

  $ aio app db document replace products '{"id": "123"}' '{"id": "123", "name": "New Product", "price": 99.99}' --json

  $ aio app db document replace posts '{"slug": "hello-world"}' '{"title": "Hello World", "content": "Updated content", "status": "published"}' --upsert

  $ aio app db doc replace users '{"email": "john@example.com"}' '{"email": "john@example.com", "name": "John", "verified": true}' --upsert --json
```

### `aio app db document count COLLECTION`

Count documents in a collection

```
USAGE
  $ aio app db document count COLLECTION [QUERY] [--json] [--region <value>]

ARGUMENTS
  COLLECTION  The name of the collection
  QUERY       The query filter document (JSON string). If not provided, counts all documents.

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Count documents in a collection

ALIASES
  $ aio app db doc count

EXAMPLES
  $ aio app db document countDocuments users

  $ aio app db document countDocuments users '{"age": {"$gte": 21}}'

  $ aio app db document countDocuments products '{"category": "electronics"}' --json

  $ aio app db doc count orders '{"status": "shipped"}'
```

## Index Management

> Note: The commands under `aio app db index <command>` are also available as `aio app db idx <command>` shorthand aliases.

### `aio app db index create COLLECTION`

Create a new index on a collection in the database

```
USAGE
  $ aio app db index create COLLECTION [--json] [--region <value>] [-s <value>] [-k <value>] [-n <value>] [-u]

ARGUMENTS
  COLLECTION  The name of the collection to create the index on

FLAGS
  -n, --name=<value>  A name that uniquely identifies the index
  -u, --unique        Creates a unique index so that the collection will not accept insertion or update of documents where the index key value matches an
                      existing value in the index

REQUIRES AT LEAST ONE OF THE INDEX DEFINITION FLAGS
  -k, --key=<value>...   Index key to use with default specification
  -s, --spec=<value>...  Index specification as a JSON object (e.g., '{"name":1, "age":-1}')

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Create a new index on a collection in the database

ALIASES
  $ aio app db idx create

EXAMPLES
  $ aio app db index create users --spec '{"name":1, "age":-1}'

  $ aio app db index create users -s '{"name":1, "age":-1}' --name "name_age_index"

  $ aio app db index create students -s '{"name":1}' --key grade --unique

  $ aio app db index create reviews -k sku -k rating

  $ aio app db index create products -s '{"name":"text", "category":"text"}' --json

  $ aio app db index create books -s '{"author":1}' -k year

  $ aio app db idx create orders --spec '{"customerId":1}' --spec '{"orderDate":-1}' --name "customer_order_index" --unique
```

### `aio app db index drop COLLECTION INDEXNAME`

Drop an index from a collection in the database

```
USAGE
  $ aio app db index drop COLLECTION INDEXNAME [--json] [--region <value>]

ARGUMENTS
  COLLECTION  The name of the collection to drop the index from
  INDEXNAME   The name of the index to drop

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Drop an index from a collection in the database

ALIASES
  $ aio app db idx drop

EXAMPLES
  $ aio app db index drop users name_age_index

  $ aio app db index drop products category_1 --json

  $ aio app db idx drop orders orderDate_index
```

### `aio app db index list COLLECTION`

Get the list of indexes from a collection in the database

```
USAGE
  $ aio app db index list COLLECTION [--json] [--region <value>]

ARGUMENTS
  COLLECTION  The name of the collection to retrieve indexes from

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Get the list of indexes from a collection in the database

ALIASES
  $ aio app db idx list

EXAMPLES
  $ aio app db index list users

  $ aio app db index list products --json

  $ aio app db idx list orders
```

## Database Management

### `aio app db ping`

Test connectivity to your App Builder database

```
USAGE
  $ aio app db ping [--json] [--region <value>]

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Test connectivity to your App Builder database

EXAMPLES
  $ aio app db ping

  $ aio app db ping --json
```

### `aio app db provision`

Provision a new database for your App Builder application

```
USAGE
  $ aio app db provision [--json] [--region <value>]

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Provision a new database for your App Builder application

EXAMPLES
  $ aio app db provision

  $ aio app db provision --region amer

  $ aio app db provision --json
```

### `aio app db delete`

Delete the database for your App Builder application (non-production only)

```
USAGE
  $ aio app db delete [--json] [--region <value>] [--force]

FLAGS
  --force  [use with caution!] force delete, skips confirmation safety prompt

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Delete the database for your App Builder application (non-production only)

EXAMPLES
  $ aio app db delete

  $ aio app db delete --force

  $ aio app db delete --json
```

### `aio app db status`

Check the provisioning status of your App Builder database

```
USAGE
  $ aio app db status [--json] [--region <value>] [--watch]

FLAGS
  --watch  Watch for status changes (press Ctrl+C to stop)

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Check the provisioning status of your App Builder database

EXAMPLES
  $ aio app db status

  $ aio app db status --watch

  $ aio app db status --json
```

### `aio app db stats`

Get statistics about your App Builder database

```
USAGE
  $ aio app db stats [--json] [--region <value>]

GLOBAL FLAGS
  --json            Format output as json.
  --region=<value>  Database region. Defaults to 'AIO_DB_REGION' environment variable or 'amer' if neither is set.
                    <options: amer|emea|apac>

DESCRIPTION
  Get statistics about your App Builder database

EXAMPLES
  $ aio app db stats

  $ aio app db stats --json
```

# Other Commands

## `aio help [COMMAND]`

Display help for aio.

```
USAGE
  $ aio help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for aio.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.16/src/commands/help.ts)_
<!-- commandsstop -->

## Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
