# aio-cli-plugin-app-storage

The CLI Plugin to manage your App Builder State storage.

If you need to access State programmatically, check the
[@adobe/aio-lib-state](https://github.com/adobe/aio-lib-state) library.

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
```

# Commands
<!-- commands -->
* [`aio app state delete [KEYS]`](#aio-app-state-delete-keys)
* [`aio app state get KEY`](#aio-app-state-get-key)
* [`aio app state list`](#aio-app-state-list)
* [`aio app state put KEY VALUE`](#aio-app-state-put-key-value)
* [`aio app state stats`](#aio-app-state-stats)
* [`aio help [COMMAND]`](#aio-help-command)

## `aio app state delete [KEYS]`

Delete key-values

```
USAGE
  $ aio app state delete [KEYS...] [--json] [--region amer|emea|apac|aus] [--match <value>] [--force]

ARGUMENTS
  [KEYS...]  keys to delete. Above 5 keys, you will be prompted for confirmation

FLAGS
  --force            [use with caution!] force delete, no safety prompt
  --match=<value>    [use with caution!] deletes ALL key-values matching the provided glob-like pattern
  --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                     <options: amer|emea|apac|aus>

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
  $ aio app state get KEY [--json] [--region amer|emea|apac|aus]

ARGUMENTS
  KEY  State key

FLAGS
  --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                     <options: amer|emea|apac|aus>

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
  $ aio app state list [--json] [--region amer|emea|apac|aus] [-m <value>]

FLAGS
  -m, --match=<value>    [default: *] Glob-like pattern to filter keys
      --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                         <options: amer|emea|apac|aus>

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
  $ aio app state put KEY VALUE [--json] [--region amer|emea|apac|aus] [-t <value>]

ARGUMENTS
  KEY    State key
  VALUE  State value

FLAGS
  -t, --ttl=<value>      Time to live in seconds. Default is 86400 (24 hours), max is 31536000 (1 year).
      --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                         <options: amer|emea|apac|aus>

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
  $ aio app state stats [--json] [--region amer|emea|apac|aus]

FLAGS
  --region=<option>  State region. Defaults to 'AIO_STATE_REGION' env or 'amer' if neither is set.
                     <options: amer|emea|apac|aus>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Display stats

EXAMPLES
  $ aio app state stats

  $ aio app state stats --json
```

## `aio help [COMMAND]`

Display help for aio.

```
USAGE
  $ aio help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for aio.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_
<!-- commandsstop -->

## Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
