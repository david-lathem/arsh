const { ApplicationCommandType } = require("discord.js");
const { testServer } = require("../../../config.json");
const areCommandsDifferent = require("../../utils/areCommandsDifferent");
const getApplicationCommands = require("../../utils/getApplicationCommands");
const getLocalCommands = require("../../utils/getLocalCommands");

module.exports = async (client) => {
  try {
    const localCommands = getLocalCommands();
    const applicationCommands = await getApplicationCommands(
      client,
      testServer
    );

    // await applicationCommands.set([]);

    for (const localCommand of localCommands) {
      const {
        name,
        description,
        options,
        type = ApplicationCommandType.ChatInput,
      } = localCommand;

      // console.log(localCommand);

      const existingCommand = await applicationCommands.cache.find(
        (cmd) => cmd.name === name
      );

      if (existingCommand) {
        if (localCommand.deleted) {
          await applicationCommands.delete(existingCommand.id);
          console.log(`🗑 Deleted command "${name}".`);
          continue;
        }

        if (
          areCommandsDifferent(existingCommand, localCommand) &&
          type === ApplicationCommandType.ChatInput
        ) {
          await applicationCommands.edit(existingCommand.id, {
            description,
            options,
            type,
          });

          console.log(`🔁 Edited command "${name}".`);
        }
      } else {
        if (localCommand.deleted) {
          console.log(
            `⏩ Skipping registering command "${name}" as it's set to delete.`
          );
          continue;
        }

        await applicationCommands.create({
          name,
          description,
          options,
          type,
        });

        console.log(`👍 Registered command "${name}."`);
      }
    }
  } catch (error) {
    console.log(error);

    console.log(error.rawError.errors.redirect_uris["6"]._erros);
  }
};
