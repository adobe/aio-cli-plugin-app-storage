import { Args, Command } from '@oclif/core'
import { exec } from 'child_process'

export default class RunMongosh extends Command {
  static args = [
    {
      name: 'mongoCommand',
      required: true,
      description: 'The MongoDB command to run in mongosh (e.g. db.stats(), db.users.find({}))',
    },
  ]

  async run() {
    const { args } = await this.parse(RunMongosh)
    const { mongoCommand } = args

    const command = `mongosh --eval "${mongoCommand}"`

    exec(command, (error, stdout, stderr) => {
      if (error) {
        this.error(`❌ Execution failed: ${stderr}`)
        return
      }
      this.log(`✅ Output:\n${stdout}`)
    })
  }
}
