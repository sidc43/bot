from javascript import require, On, AsyncTask, off
from simple_chalk import chalk

mineflayer = require("mineflayer")
mineflayer_pathfinder = require("mineflayer-pathfinder")
vec3 = require("vec3")

def vec3_to_str(v):
    return f"x: {v['x']:.3f}, y: {v['y']:.3f}, z: {v['z']:.3f}"

server_host = "localhost"
server_port = 60060
reconnect = True

class MCBot:
    def __init__(self, bot_name):
        self.bot_args = {
            "host": server_host,
            "port": server_port,
            "username": bot_name,
            "hideErrors": False,
        }
        self.reconnect = reconnect
        self.bot_name = bot_name
        self.start_bot()

    def log(self, message):
        print(f"[{self.bot.username}] {message}")

    def pathfind_to_goal(self, goal_location):
        try:
            self.bot.pathfinder.setGoal(
                mineflayer_pathfinder.pathfinder.goals.GoalNear(
                    goal_location["x"], goal_location["y"], goal_location["z"], 1
                )
            )
        except Exception as e:
            self.log(f"Error in pathfind_to_goal: {e}")

    def start_bot(self):
        self.bot = mineflayer.createBot(self.bot_args)
        self.bot.loadPlugin(mineflayer_pathfinder.pathfinder)
        self.start_events()

    def start_events(self):

        @On(self.bot, "login")
        def login(this):
            self.bot_socket = self.bot._client.socket
            self.log(chalk.green(
                f"Logged in to {self.bot_socket.server if self.bot_socket.server else self.bot_socket._host}"
            ))

        @On(self.bot, "spawn")
        def spawn(this):
            self.bot.chat("Hello world!")
            self.log("Spawned and ready.")

        @On(self.bot, "kicked")
        def kicked(this, reason, loggedIn):
            self.log(chalk.red(f"Kicked: {reason}"))

        @On(self.bot, "chat")
        def on_chat(this, username, message, messagePosition, jsonMsg):
            if username == self.bot.username:
                return

            msg = message.lower().strip()
            self.log(f"Received chat from {username}: {msg}")

            if msg == "inventory":
                self.log("Listing inventory contents...")
                slots = self.bot.inventory.slots
                item_list = [item for item in slots if item]
                if item_list:
                    self.bot.chat("Inventory:")
                    for item in item_list:
                        self.bot.chat(f"{item.name} x {item.count}")
                else:
                    self.bot.chat("Inventory is empty.")

            elif msg == "debug inventory raw":
                for i, item in enumerate(self.bot.inventory.slots):
                    if item:
                        self.log(f"Slot {i}: {item.name} x {item.count}")

            elif msg.startswith("build "):
                parts = msg.split()
                if len(parts) != 3:
                    self.bot.chat("Usage: build <NxM> <block>")
                    return

                try:
                    dims = parts[1].split("x")
                    width, height = int(dims[0]), int(dims[1])
                    block_name = parts[2].lower()
                except:
                    self.bot.chat("Invalid format. Try: build 3x3 dirt")
                    return

                block_total = width * height
                items = [item for item in self.bot.inventory.slots if item and item.name == block_name]

                if not items or sum(item.count for item in items) < block_total:
                    self.bot.chat(f"Not enough {block_name}. Need {block_total}.")
                    return

                block_item = items[0]
                pos = self.bot.entity.position.offset(1, -1, 1)
                self.bot.chat(f"Building {width}x{height} of {block_name}...")

                async def build_platform():
                    placed = 0
                    try:
                        await self.bot.equip(block_item, "hand")
                        for dx in range(width):
                            for dz in range(height):
                                place_pos = vec3(pos.x + dx, pos.y, pos.z + dz)
                                below = self.bot.blockAt(place_pos.offset(0, -1, 0))

                                if below and self.bot.canPlaceBlock(below):
                                    try:
                                        await self.bot.placeBlock(below, vec3(0, 1, 0))
                                        placed += 1
                                    except Exception as e:
                                        self.log(f"Place failed at {vec3_to_str(place_pos)}: {e}")
                                else:
                                    self.log(f"Invalid reference block below {vec3_to_str(place_pos)}")
                    except Exception as e:
                        self.log(f"Error during building: {e}")

                    self.bot.chat(f"Finished building. Placed {placed}/{block_total} blocks.")

                # Use AsyncTask with no args and closure capture
                AsyncTask(build_platform)()

            elif msg == "come to me":
                local_players = self.bot.players
                player_location = None
                for el in local_players:
                    player_data = local_players[el]
                    if player_data and player_data.uuid:
                        if player_data.username.lower() == username.lower():
                            vec = player_data.entity.position
                            player_location = vec3(vec.x, vec.y + 1, vec.z)
                            break

                if player_location:
                    self.bot.chat("Coming to you!")
                    self.pathfind_to_goal(player_location)
                else:
                    self.bot.chat("Could not find you.")

            elif msg == "quit":
                self.bot.chat("Bye!")
                self.reconnect = False
                this.quit()

        @On(self.bot, "end")
        def end(this, reason):
            self.log(chalk.red(f"Disconnected: {reason}"))
            if self.reconnect:
                self.log("Reconnecting...")
                self.start_bot()
            off(self.bot, "login", login)
            off(self.bot, "spawn", spawn)
            off(self.bot, "kicked", kicked)
            off(self.bot, "chat", on_chat)
            off(self.bot, "end", end)

# Start the bot
bot = MCBot("Spark")
