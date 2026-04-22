const { Telegraf, Markup } = require("telegraf");
const mongoose = require("mongoose");

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = 7954041423;
const MONGO = process.env.MONGO_URL;

// ====== INIT ======
const bot = new Telegraf(BOT_TOKEN);

// ====== DB ======
mongoose.connect(MONGO);

const userSchema = new mongoose.Schema({
  userId: Number,
  banned: { type: Boolean, default: false },
  dailyCount: { type: Number, default: 0 },
  dailyDate: String
});
const User = mongoose.model("User", userSchema);

// ====== ADMIN SYSTEM ======
let admins = [OWNER_ID];

// ====== START ======
bot.start(async (ctx) => {
  let user = await User.findOne({ userId: ctx.from.id });

  if (!user) {
    user = await User.create({ userId: ctx.from.id });
  }

  if (user.banned) {
    return ctx.reply("🚫 You are banned");
  }

  if (!admins.includes(ctx.from.id)) {
    return ctx.reply(
      "❌ Unauthorized\n\nContact owner to buy access",
      Markup.inlineKeyboard([
        [Markup.button.url("Contact Owner", `tg://user?id=${OWNER_ID}`)]
      ])
    );
  }

  ctx.reply(
    `👑 Welcome Admin\nID: ${ctx.from.id}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⚙️ Admin Panel", "ADMIN")]
    ])
  );
});

// ====== ADMIN PANEL ======
bot.action("ADMIN", (ctx) => {
  if (!admins.includes(ctx.from.id)) return;

  ctx.editMessageText(
    "⚙️ Admin Panel",
    Markup.inlineKeyboard([
      [Markup.button.callback("👥 Users", "USERS")],
      [Markup.button.callback("📢 Broadcast", "BC")]
    ])
  );
});

// ====== USERS LIST ======
bot.action("USERS", async (ctx) => {
  if (!admins.includes(ctx.from.id)) return;

  let count = await User.countDocuments();
  ctx.reply(`👥 Total Users: ${count}`);
});

// ====== BROADCAST ======
bot.action("BC", (ctx) => {
  if (!admins.includes(ctx.from.id)) return;
  ctx.reply("Send message to broadcast:");
  bot.once("text", async (msgCtx) => {
    let users = await User.find();
    users.forEach(u => {
      bot.telegram.sendMessage(u.userId, msgCtx.message.text).catch(() => {});
    });
    msgCtx.reply("✅ Broadcast Sent");
  });
});

// ====== BAN COMMAND ======
bot.command("ban", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return;

  let id = ctx.message.text.split(" ")[1];
  await User.updateOne({ userId: Number(id) }, { banned: true });

  ctx.reply("🚫 User banned");
});

// ====== UNBAN ======
bot.command("unban", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return;

  let id = ctx.message.text.split(" ")[1];
  await User.updateOne({ userId: Number(id) }, { banned: false });

  ctx.reply("✅ User unbanned");
});

// ====== START SERVER ======
bot.launch();
console.log("Bot running...");
