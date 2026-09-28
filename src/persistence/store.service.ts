import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { workspaceRoot } from "../config/environment";
import { createClient } from "@supabase/supabase-js";
import { Session, products, sources } from "../knowledge/knowledge";
@Injectable()
export class StoreService {
  private dir = process.env.DATA_DIR || join(workspaceRoot, "data");
  private db =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } },
        )
      : null;
  async init() {
    await mkdir(join(this.dir, "sessions"), { recursive: true });
    await mkdir(join(this.dir, "outbox"), { recursive: true });
    if (this.db) {
      const p = await this.db.from("products").upsert(products);
      if (p.error) throw p.error;
      const k = await this.db.from("knowledge_sources").upsert(sources);
      if (k.error) throw k.error;
    }
  }
  async get(id: string): Promise<Session | null> {
    if (this.db) {
      const { data, error } = await this.db
        .from("sessions")
        .select("payload")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data?.payload || null;
    }
    try {
      return JSON.parse(
        await readFile(join(this.dir, "sessions", id + ".json"), "utf8"),
      );
    } catch (e: any) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }
  async save(s: Session) {
    if (this.db) {
      const { error } = await this.db
        .from("sessions")
        .upsert({ id: s.id, payload: s, updated_at: new Date().toISOString() });
      if (error) throw error;
      return;
    }
    const path = join(this.dir, "sessions", s.id + ".json");
    await writeFile(path + ".tmp", JSON.stringify(s, null, 2));
    await rename(path + ".tmp", path);
  }
  async capture(id: string, mail: unknown) {
    await writeFile(
      join(this.dir, "outbox", id + ".json"),
      JSON.stringify(mail, null, 2),
    );
  }
}
