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
* [`aio app db collection create COLLECTIONNAME`](#aio-app-db-collection-create-collectionname)
* [`aio app db collection drop COLLECTIONNAME`](#aio-app-db-collection-drop-collectionname)
* [`aio app db collection rename CURRENTNAME NEWNAME`](#aio-app-db-collection-rename-currentname-newname)
* [`aio app db collection stats COLLECTIONNAME`](#aio-app-db-collection-stats-collectionname)

### Index Management
* [`aio app db collection createIndex COLLECTIONNAME SPECIFICATION`](#aio-app-db-collection-createindex-collectionname-specification)
* [`aio app db collection dropIndex COLLECTIONNAME INDEXNAME`](#aio-app-db-collection-dropindex-collectionname-indexname)
* [`aio app db collection getIndexes COLLECTIONNAME`](#aio-app-db-collection-getindexes-collectionname)

### Database Information
* [`aio app db getCollectionInfos`](#aio-app-db-getcollectioninfos)
* [`aio app db getCollectionNames`](#aio-app-db-getcollectionnames)
* [`aio app db stats`](#aio-app-db-stats)

### Database Management
* [`aio app db ping`](#aio-app-db-ping)
* [`aio app db provision`](#aio-app-db-provision)
* [`aio app db status`](#aio-app-db-status)

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

### `aio app db collection create COLLECTIONNAME`

Create a new collection in the database

```
USAGE
  $ aio app db collection create COLLECTIONNAME [--json] [-c <value>] [-v <value>]

ARGUMENTS
  COLLECTIONNAME  The name of the collection to create

FLAGS
  -c, --collation=<value>  Collation document for text comparison and sorting (JSON string, e.g., '{"locale": "en_US", "strength": 1}')
  -v, --validator=<value>  JSON schema validator for document validation (JSON string)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create a new collection in the database

**Note about Collation:** The `--collation` flag accepts a JSON document following the MongoDB collation specification. Common fields include:
- `locale`: Language and country code (e.g., "en_US", "fr_FR", "simple")
- `strength`: Comparison level (1-5, where 1 is case-insensitive)
- `caseLevel`: Whether to consider case differences
- `numericOrdering`: Whether to compare numbers numerically

For more details, see the [MongoDB Collation Documentation](https://www.mongodb.com/docs/manual/reference/collation/).

EXAMPLES
  $ aio app db collection create users

  $ aio app db collection create products --json

  $ aio app db collection create users --collation '{"locale": "en_US", "strength": 1}'

  $ aio app db collection create products --validator '{"$schema": "http://json-schema.org/draft-04/schema#", "type": "object", "properties": {"name": {"type": "string"}, "price": {"type": "number", "minimum": 0}}, "required": ["name", "price"]}'

  $ aio app db collection create inventory --collation '{"locale": "simple"}' --validator '{"type": "object", "required": ["id", "quantity"]}' --json
```

### `aio app db collection drop COLLECTIONNAME`

Drop a collection from the database

```
USAGE
  $ aio app db collection drop COLLECTIONNAME [--json]

ARGUMENTS
  COLLECTIONNAME  The name of the collection to drop

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Drop a collection from the database

EXAMPLES
  $ aio app db collection drop users

  $ aio app db collection drop products --json
```

### `aio app db collection rename CURRENTNAME NEWNAME`

Rename a collection in the database

```
USAGE
  $ aio app db collection rename CURRENTNAME NEWNAME [--json]

ARGUMENTS
  CURRENTNAME  The current name of the collection to rename
  NEWNAME      The new name for the collection

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Rename a collection in the database

EXAMPLES
  $ aio app db collection rename users customers

  $ aio app db collection rename old_products new_products --json
```

### `aio app db collection stats COLLECTIONNAME`

Get statistics for a collection in the database

```
USAGE
  $ aio app db collection stats COLLECTIONNAME [--json]

ARGUMENTS
  COLLECTIONNAME  The name of the collection to get stats for

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get statistics for a collection in the database

EXAMPLES
  $ aio app db collection stats users

  $ aio app db collection stats products --json
```

## Index Management

### `aio app db collection createIndex COLLECTIONNAME SPECIFICATION`

Create an index on a collection in your App Builder database

```
USAGE
  $ aio app db collection createIndex COLLECTIONNAME [--spec <index_spec>] [--key <index_key>] [--name <index_name>] [--unique] [--json]

ARGUMENTS
  COLLECTIONNAME  The name of the collection to create the index on

FLAGS
  -n, --name=<value>  A name that uniquely identifies the index
  -u, --unique        Creates a unique index so that the collection will not accept insertion or update of documents where the index key value matches an existing value in the index

GLOBAL FLAGS
  --json  Format output as json

REQUIRES AT LEAST ONE INDEX DEFINITION FLAGS
  -k, --key=<value>...   Index key to use with default specification
  -s, --spec=<value>...  Index specification as a JSON object (e.g., '{"name":1, "age":-1}')

DESCRIPTION
  Create a new index on a collection in the database

EXAMPLES
  $ aio app db collection createIndex users --spec '{"name":1, "age":-1}'

  $ aio app db collection createIndex users -s '{"name":1, "age":-1}' --name "name_age_index"

  $ aio app db collection createIndex students -s '{"name":1}' --key grade --unique

  $ aio app db collection createIndex reviews -k sku -k rating

  $ aio app db collection createIndex products -s '{"name":"text", "category":"text"}' --json

  $ aio app db collection createIndex books -s '{"author":1}' -k year
```

### `aio app db collection dropIndex COLLECTIONNAME INDEXNAME`

Drop an index from a collection in your App Builder database

```
USAGE
  $ aio app db collection dropIndex COLLECTIONNAME INDEXNAME [--json]

ARGUMENTS
  COLLECTIONNAME  The name of the collection to drop the index from
  INDEXNAME       The name of the index to drop

GLOBAL FLAGS
  --json  Format output as json

DESCRIPTION
  Drop an index from a collection in the database

EXAMPLES
  $ aio app db collection dropIndex users name_age_index

  $ aio app db collection dropIndex products category_1 --json
```

### `aio app db collection getIndexes COLLECTIONNAME`

Get all indexes for a collection in your App Builder database

```
USAGE
  $ aio app db collection getIndexes COLLECTIONNAME [--json]

ARGUMENTS
  COLLECTIONNAME  The name of the collection to retrieve indexes from

GLOBAL FLAGS
  --json  Format output as json

DESCRIPTION
  Get the list of indexes from a collection in the database

EXAMPLES
  $ aio app db collection getIndexes users

  $ aio app db collection getIndexes products --json
```

## Database Information

### `aio app db getCollectionInfos`

Get details about your App Builder database

```
USAGE
  $ aio app db getCollectionInfos [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get details about your App Builder database

EXAMPLES
  $ aio app db getCollectionInfos

  $ aio app db getCollectionInfos --json
```

### `aio app db getCollectionNames`

Get collection names from your App Builder database

```
USAGE
  $ aio app db getCollectionNames [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get collection names from your App Builder database

ALIASES
  $ aio app db show collections

EXAMPLES
  $ aio app db getCollectionNames

  $ aio app db getCollectionNames --json
```

### `aio app db stats`

Get statistics about your App Builder database

```
USAGE
  $ aio app db stats [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get statistics about your App Builder database

EXAMPLES
  $ aio app db stats

  $ aio app db stats --json
```

## Database Management

### `aio app db ping`

Test connectivity to your App Builder database

```
USAGE
  $ aio app db ping [--json]

GLOBAL FLAGS
  --json  Format output as json.

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
  $ aio app db provision [--json] [--region amer|emea|apac]

FLAGS
  --region=<option>  Region in which database is to be provisioned
                     <options: amer|emea|apac>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Provision a new database for your App Builder application

EXAMPLES
  $ aio app db provision

  $ aio app db provision --region amer

  $ aio app db provision --json
```

### `aio app db status`

Check the provisioning status of your App Builder database

```
USAGE
  $ aio app db status [--json] [--watch]

FLAGS
  --watch  Watch for status changes (press Ctrl+C to stop)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check the provisioning status of your App Builder database

EXAMPLES
  $ aio app db status

  $ aio app db status --watch

  $ aio app db status --json
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
