"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const dgram_1 = __importDefault(require("dgram"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const IP = process.env.IP || "";
const MAC = process.env.MAC || "";
const WAKE_SECRET = process.env.WAKE_SECRET || "";
const PORT = process.env.PORT || 4000;
const execAsync = util_1.default.promisify(child_process_1.exec);
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "https://wol.putty-ai.com",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
}));
app.use(express_1.default.json());
app.get("/api/ping", async (req, res) => {
    try {
        const cmd = `ping -c 1 -W 2 ${IP}`;
        try {
            await execAsync(cmd, { timeout: 4000 });
            return res.status(200).json({ ok: true, source: "icmp" });
        }
        catch (err) {
            return res.status(400).json({ ok: false });
        }
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: String(err) });
    }
});
app.post("/api/wake", async (req, res) => {
    try {
        const post_secret = req.body && req.body.secret;
        if (!post_secret)
            return res.status(400).json({ error: "Missing secret" });
        if (post_secret !== WAKE_SECRET)
            return res.status(401).json({ error: "Invalid secret" });
    }
    catch (err) {
        return res.status(500).json({ error: "Internal server error" });
    }
    try {
        if (!/^[0-9a-fA-F]{12}$/.test(MAC)) {
            return res.status(400).json({ error: "Configured MAC is invalid" });
        }
        const macBytes = Buffer.from(MAC, "hex");
        const packet = Buffer.alloc(6 + 16 * 6, 0xff);
        for (let i = 0; i < 16; i++) {
            macBytes.copy(packet, 6 + i * 6);
        }
        const client = dgram_1.default.createSocket("udp4");
        const cleanup = () => {
            try {
                client.close();
            }
            catch (e) { }
        };
        client.on("error", (err) => {
            cleanup();
            if (!res.headersSent) {
                return res.status(500).json({ error: `Socket error: ${err.message}` });
            }
        });
        client.bind(() => {
            try {
                client.setBroadcast(true);
            }
            catch (e) {
                cleanup();
                return res.status(500).json({ error: `Failed to enable broadcast: ${e}` });
            }
            client.send(packet, 0, packet.length, 9, "255.255.255.255", (err) => {
                cleanup();
                if (err) {
                    return res.status(500).json({ error: `Failed to send magic packet: ${err}` });
                }
                return res.json({ success: true, packet: packet });
            });
            setTimeout(() => {
                if (!res.headersSent) {
                    cleanup();
                    return res.status(504).json({ error: "Timeout sending magic packet" });
                }
            }, 5000);
        });
    }
    catch (err) {
        return res.status(500).json({ error: `Error: ${err}` });
    }
});
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
//# sourceMappingURL=index.js.map