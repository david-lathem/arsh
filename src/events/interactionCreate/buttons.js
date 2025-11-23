const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const discordTranscripts = require("discord-html-transcripts");
const Attendance = require("../../models/Attendance");
const EmailDraft = require("../../models/EmailDraft");
const { updateOrderStatus } = require("../../utils/woocommerceClient");
const order = require("../../models/order");
const { giveXp } = require("../../utils/xpSystem");
const User = require("../../models/User");
const { handleUserLogin } = require("../../utils/streakBadges");
const Giveaway = require("../../models/Giveaway");
const OrderAssignment = require("../../models/OrderAssignment");
const Ticket = require("../../models/Ticket");
const OpenAI = require("openai").default;
module.exports = async (client, interaction) => {
  try {
    if (!interaction.isButton()) return;

    const [action, id, id2] = interaction.customId.split("_");
    console.log(interaction.customId);
    switch (action) {
      case "attendanceSignIn":
        await handleAttendanceSignIn(client, interaction);
        break;

      case "attendanceSignOut":
        await handleAttendanceSignOut(client, interaction);
        break;

      case "openTicket":
        await handleOpenTicket(client, interaction);
        break;

      case "claimticket":
        await handleClaimTicket(client, interaction);
        break;

      case "resolveTicket":
        await handleResolveTicket(interaction);
        break;
      case "escalateTicket":
        await handleEscalateTicket(interaction);
        break;

      case "rewriteemail":
        await handleRewriteEmail(interaction);
        break;

      case "wcmark":
        await handleWcMarkPaidAndSorted(client, interaction, id, id2);
        break;

      case "wcassign":
        await handleWcAssign(client, interaction, id, id2);
        break;
      case "giveaway":
        await handleGiveaway(client, interaction, id);
      default:
        console.log(`Unknown button action: ${action}`);
    }
  } catch (err) {
    console.log(err);
  }
};

// -------------------------------------------
// SIGN IN
// -------------------------------------------

async function handleAttendanceSignIn(client, interaction) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const today = new Date().toISOString().slice(0, 10);

  let record = await Attendance.findOne({ guildId, userId });

  if (!record) {
    record = await Attendance.create({ guildId, userId, dates: [] });
  }

  const dayRecord = record.dates.find((d) => d.date === today);

  if (dayRecord?.signIn) {
    return interaction.reply({
      ephemeral: true,
      content: `⛔ You already **signed in** today.`,
    });
  }

  if (dayRecord) {
    dayRecord.signIn = new Date();
  } else {
    record.dates.push({
      date: today,
      signIn: new Date(),
      signOut: null,
    });
  }

  await record.save();

  // ⭐ streaks + weekly + badges
  const { earnedBadges } = await handleUserLogin(userId);

  // ⭐ give XP
  await giveXp(userId, interaction.guild, "sign_in");

  // ⭐ send badge notifications
  if (earnedBadges.length > 0) {
    const channel = interaction.guild.channels.cache.get(
      process.env.ACHEIVEMENT_CHANNEL_ID
    );

    for (const badge of earnedBadges) {
      channel.send({
        embeds: [
          {
            title: `🏅 New Badge Earned!`,
            description: `**${interaction.user.username}** just earned the **${badge}** badge!`,
            color: 0xffd700,
          },
        ],
      });
    }
  }

  await sendSignInLog(client, interaction.user, interaction.guild, dayRecord);
  return interaction.reply({
    ephemeral: true,
    content: `✅ **Sign-in successful!**`,
  });
}

// -------------------------------------------
// SIGN OUT
// -------------------------------------------
async function handleAttendanceSignOut(client, interaction) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const today = new Date().toISOString().slice(0, 10);

  const record = await Attendance.findOne({ guildId, userId });

  if (!record) {
    return interaction.reply({
      ephemeral: true,
      content: "⛔ You haven't signed in today.",
    });
  }

  const dayRecord = record.dates.find((d) => d.date === today);

  if (!dayRecord?.signIn) {
    return interaction.reply({
      ephemeral: true,
      content: "⛔ You haven't signed in today.",
    });
  }

  if (dayRecord.signOut) {
    return interaction.reply({
      ephemeral: true,
      content: "⛔ You already signed out today.",
    });
  }

  dayRecord.signOut = new Date();
  await record.save();
  await giveXp(userId, interaction.guild, "sign_out");
  // Send sign-out log with total hours
  await sendSignOutLog(client, interaction.user, interaction.guild, dayRecord);

  return interaction.reply({
    ephemeral: true,
    content: `✅ **Sign-out successful!**`,
  });
}

// -------------------------------------------
// Open Ticket
// -------------------------------------------

const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID;
const TICKET_CHANNEL_ID = process.env.TICKET_CLAIM_CHANNEL_ID;
const categoryId = process.env.TICKET_CATEGORY_ID;
async function handleOpenTicket(client, interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  const existingChannel = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      ch.name === `ticket-${user.username.toLowerCase()}` &&
      ch.parentId === categoryId
  );

  if (existingChannel) {
    return interaction.reply({
      content: `⛔ You already have an open ticket: ${existingChannel}`,
      ephemeral: true,
    });
  }

  // Create private channel
  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
      {
        id: MANAGER_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
      {
        id: SUPPORT_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
    ],
  });

  const Ticketembed = new EmbedBuilder()
    .setTitle(`🎫 Ticket — ${user.username}`)
    .setDescription(
      "Hello! Our support team will assist you shortly.\n\n" +
        "Use the buttons below to resolve or escalate this ticket."
    )
    .setColor("#00b1ff")
    .setFooter({ text: "YourMuscleShop Support Ticket" })
    .setTimestamp();

  // Buttons
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`claimticket`)
      .setLabel("Claim Ticket")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("resolveTicket")
      .setLabel("Resolve")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("escalateTicket")
      .setLabel("Escalate to Manager")
      .setEmoji("🚨")
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: `<@${user.id}>`,
    embeds: [Ticketembed],
    components: [buttonRow],
  });

  // Save ticket to DB
  await Ticket.create({
    channelId: ticketChannel.id,
    creatorId: interaction.user.id,
  });

  // const embed = new EmbedBuilder()
  //   .setTitle("🎟️ New Ticket!")
  //   .setDescription(
  //     `Click the button below to claim this ticket.\n` +
  //       `Only the first person to claim will get access.\n` +
  //       `Support role will **never** see this ticket.`
  //   )
  //   .setColor("#ff7b00")
  //   .setTimestamp();

  // const claimChannel = await client.channels.fetch(TICKET_CHANNEL_ID);
  // await claimChannel.send({ embeds: [embed], components: [row] });

  await interaction.reply({
    content: `✅ Your ticket has been created: ${ticketChannel}`,
    ephemeral: true,
  });
}

async function handleClaimTicket(client, interaction) {
  const channel = interaction.channel;

  const ticket = await Ticket.findOne({ channelId: channel.id });

  if (!ticket) {
    return interaction.reply({
      content: "❌ Ticket not found.",
      ephemeral: true,
    });
  }

  if (ticket.status === "claimed") {
    return await interaction.reply({
      content: "❌ This ticket has already been claimed.",
      ephemeral: true,
    });
  }

  await channel.permissionOverwrites.edit(process.env.SUPPORT_ROLE_ID, {
    ViewChannel: false,
    SendMessages: SUPPORT_ROLE_ID,
  });

  // Update permissions for the claimer

  await channel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel: true,
    SendMessages: true,
  });

  // Update ticket in DB
  ticket.status = "claimed";
  ticket.claimerId = interaction.user.id;
  ticket.claimedAt = new Date();
  await ticket.save();

  // Update embed and remove button
  const messages = await channel.messages.fetch({ limit: 50 });
  const embedMsg = messages.find((m) => m.embeds.length > 0);
  if (embedMsg) {
    const embed = EmbedBuilder.from(embedMsg.embeds[0]).setDescription(
      `This ticket has been claimed by <@${interaction.user.id}>.\nOnly they and managers can view this channel now.`
    );

    embedMsg.components[0].components.splice(0, 1);

    await embedMsg.edit({
      embeds: [embed],
      components: embedMsg.components,
    });
  }

  await interaction.reply({
    content: "✅ You have successfully claimed this ticket!",
    ephemeral: true,
  });
}

// -------------------------------------------
// RESOLVE
// -------------------------------------------

async function handleResolveTicket(interaction) {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  const managerRoleId = process.env.MANAGER_ROLE_ID;
  const channel = interaction.channel;

  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (!ticket) {
    return interaction.reply({
      content: "❌ Ticket data not found in the database.",
      ephemeral: true,
    });
  }
  if (!channel) return;

  if (
    ticket.claimerId !== interaction.user.id &&
    !interaction.member.roles.cache.has(managerRoleId)
  ) {
    return interaction.reply({
      content:
        "⛔ Only the ticket claimer or managers can resolve this ticket.",
      ephemeral: true,
    });
  }

  // Export full chat as HTML
  const transcript = await discordTranscripts.createTranscript(channel, {
    returnBuffer: true,
    fileName: `ticket-${channel.name}.html`,
  });

  const embed = new EmbedBuilder()
    .setTitle("📜 Ticket Resolved")
    .setDescription(
      `Ticket **${channel.name}** has been resolved by <@${interaction.user.id}>`
    )
    .setColor("#00ff00")
    .setTimestamp();

  // Send transcript to log channel
  const logChannel = await interaction.guild.channels.fetch(logChannelId);
  if (logChannel) {
    await logChannel.send({
      embeds: [embed],
      files: [transcript],
    });
  }

  // Fetch user & update ticket resolved count
  const user = await User.findOne({ discordId: interaction.user.id });
  if (user) {
    user.stats.ticketsResolved = (user.stats.ticketsResolved || 0) + 1;
    await user.save();
  }

  // Give XP for resolving ticket
  await giveXp(interaction.user.id, interaction.guild, "ticket_resolved");

  // Delete the ticket channel
  await channel.delete().catch(() => null);

  // Respond to user
  await interaction.reply({
    content: "✅ Ticket resolved, logged, XP awarded, and channel deleted!",
    ephemeral: true,
  });
}

// -------------------------------------------
// ESCALATE
// -------------------------------------------

async function handleEscalateTicket(interaction) {
  const channel = interaction.channel;
  const managerRoleId = process.env.MANAGER_ROLE_ID;

  if (!channel) return;

  // Fetch ticket from DB
  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (!ticket) {
    return interaction.reply({
      content: "❌ Ticket data not found in the database.",
      ephemeral: true,
    });
  }

  // Only claimer or manager can escalate
  if (ticket.claimerId !== interaction.user.id) {
    return interaction.reply({
      content: "⛔ Only the ticket claimer can escalate this ticket.",
      ephemeral: true,
    });
  }

  // Notify manager role
  await channel.send({
    content: `🚨 This ticket has been escalated to the Manager: <@&${managerRoleId}>`,
  });

  await interaction.reply({
    content: "✅ Ticket escalated to manager successfully!",
    ephemeral: true,
  });
}
// -------------------------------------------
// REWRITE AI
// -------------------------------------------
async function handleRewriteEmail(interaction) {
  const record = await EmailDraft.findOne({
    messageId: interaction.message.id,
  });

  if (!record) {
    return interaction.reply({
      content: "❌ Email not found in database.",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`rewriteemailmodal_${record.messageId}`)
    .setTitle("Rewrite Email");

  const changes = new TextInputBuilder()
    .setCustomId("rewrite_changes")
    .setLabel("What changes do you want?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(changes));

  await interaction.showModal(modal);
}

// -------------------------------------------
// REWRITE AI
// -------------------------------------------

async function handleWcMarkPaidAndSorted(client, interaction, action, orderId) {
  await interaction.deferReply({ ephemeral: true });
  const Order = await order.findOne({ orderId: parseInt(orderId, 10) });
  if (!Order) {
    return await interaction.editReply({
      content: "❌ Order not found in DB.",
      ephemeral: true,
    });
  }

  const logChannel = await interaction.guild.channels
    .fetch(process.env.ORDER_UPDATE_CHANNEL)
    .catch(() => null);

  try {
    if (!action) return;

    let newStatus;
    if (action === "paid") newStatus = "processing";
    if (action === "sorted") newStatus = "completed";
    console.log(newStatus);
    if (action === "sorted") {
      await giveXp(interaction.user.id, interaction.guild, "sorted");
    }
    if (action === "paid") {
      await giveXp(interaction.user.id, interaction.guild, "paid");
    }
    // Update WooCommerce
    const updated = await updateOrderStatus(orderId, { status: newStatus });
    console.log(updated);
    // Update DB
    Order.status = updated.status;
    await Order.save();
    // Edit original embed
    const newFields = interaction.message.embeds[0].data.fields.map((f) => {
      if (f.name !== "🔁 Status") return f;

      return { name: "🔁 Status", value: updated.status, inline: true };
    });

    const embed = new EmbedBuilder(interaction.message.embeds[0]).setFields(
      newFields
    );

    await interaction.message.edit({ embeds: [embed] });
    const user = await User.findOne({ discordId: interaction.user.id });
    if (user) {
      user.stats.ordersSorted = (user.stats.ordersSorted || 0) + 1;
      await user.save();
    }
    // Reply ephemeral
    await interaction.editReply({
      content: `✅ Order #${orderId} marked **${action.toUpperCase()}**`,
      ephemeral: true,
    });

    // Log in log channel
    if (logChannel) {
      await logChannel.send(
        `📝 **${
          interaction.user.tag
        }** marked Order #${orderId} as **${action.toUpperCase()}**`
      );
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleWcAssign(client, interaction, action, orderId) {
  const userTag = interaction.user.tag;
  const embed = interaction.message.embeds[0];
  if (!embed)
    return interaction.reply({
      content: "❌ Embed not found.",
      ephemeral: true,
    });

  // Check if order is already assigned to anyone
  const existing = await OrderAssignment.findOne({ orderId });
  if (existing) {
    return interaction.reply({
      content: `❌ Order #${orderId} has already been assigned to **${existing.assignedRole.toUpperCase()}** by ${
        existing.assignedBy
      }.`,
      ephemeral: true,
    });
  }

  const embedFields = [...embed.fields];
  const roleName = action === "shipping" ? "Shipping" : "CS";
  const roleId =
    action === "shipping"
      ? process.env.SHIPPING_ROLE_ID
      : process.env.SUPPORT_ROLE_ID;

  // Update embed
  const fieldIndex = embedFields.findIndex(
    (f) => f.name === `Assigned to ${roleName}`
  );
  const fieldValue = `<@&${roleId}> • Assigned by ${userTag}`;
  if (fieldIndex !== -1) {
    embedFields[fieldIndex].value = fieldValue;
  } else {
    embedFields.push({
      name: `Assigned to ${roleName}`,
      value: fieldValue,
      inline: false,
    });
  }

  // Edit original message
  await interaction.message.edit({
    embeds: [EmbedBuilder.from(embed).setFields(embedFields)],
  });

  // Save assignment in DB
  await OrderAssignment.create({
    orderId,
    assignedBy: userTag,
    assignedRole: action,
    discordMessageId: interaction.message.id,
  });

  // Send log to role-specific channel
  const logChannelId =
    action === "shipping"
      ? process.env.SHIPPING_LOG_CHANNEL
      : process.env.CS_LOG_CHANNEL;

  const logChannel = await interaction.guild.channels.fetch(logChannelId);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setTitle(`📦 Order #${orderId} Assigned`)
      .setDescription(
        `Assigned to **${roleName}** by <@${interaction.user.id}>`
      )
      .addFields(...embed.fields) // original order fields
      .setColor(action === "shipping" ? "#00ff00" : "#ff9900")
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
  }

  // Reply to interaction
  return interaction.reply({
    content: `✅ Order #${orderId} assigned to **${roleName}** successfully!`,
    ephemeral: true,
  });
}

async function handleGiveaway(client, interaction, giveawayId) {
  await interaction.deferReply({ ephemeral: true });

  // Fetch giveaway from DB
  const giveaway = await Giveaway.findById(giveawayId);
  if (!giveaway) {
    return interaction.editReply("❌ Giveaway not found or already ended.");
  }

  // Check if user already participated
  if (giveaway.participants.includes(interaction.user.id)) {
    return interaction.editReply("⚠️ You have already joined this giveaway!");
  }

  // Add user to participants
  giveaway.participants.push(interaction.user.id);
  await giveaway.save();

  // Acknowledge user
  await interaction.editReply(`✅ You joined the giveaway! Good luck! 🎉`);
}
// -------------------------------------------
// LOGGING EMBEDS
// -------------------------------------------

async function sendSignInLog(client, user, guild) {
  const channel = guild.channels.cache.get(process.env.ATTENDANCE_LOG_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#37b24d")
    .setTitle("📥 User Signed In")
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "👤 User",
        value: `${user} (\`${user.username}\`)`,
        inline: false,
      },
      {
        name: "⏰ Sign In",
        value: `<t:${Math.floor(Date.now() / 1000)}:T>`,
        inline: false,
      }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function sendSignOutLog(client, user, guild, dayRecord) {
  const channel = guild.channels.cache.get(process.env.ATTENDANCE_LOG_CHANNEL);
  if (!channel) return;

  const signIn = new Date(dayRecord.signIn);
  const signOut = new Date(dayRecord.signOut);

  const totalMs = signOut - signIn;
  const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2);

  const embed = new EmbedBuilder()
    .setColor("#e03131")
    .setTitle("📤 User Signed Out")
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "👤 User",
        value: `${user} (\`${user.username}\`)`,
        inline: false,
      },
      {
        name: "⏰ Sign In",
        value: `<t:${Math.floor(signIn.getTime() / 1000)}:T>`,
        inline: true,
      },
      {
        name: "⏰ Sign Out",
        value: `<t:${Math.floor(signOut.getTime() / 1000)}:T>`,
        inline: true,
      },
      {
        name: "🕒 Total Time Worked",
        value: `**${totalHours} hours**`,
        inline: false,
      }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
