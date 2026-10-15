import { query } from "@/lib/db";
import { siteAccess, body, err, handle, json } from "@/lib/api";
export const dynamic = "force-dynamic";

// GET /api/comments?post_id=N  -> visible answers on a feed post, best first then oldest first
export const GET = handle(async (req: Request) => {
  if (!(await siteAccess(req))) return err(401, "Sign in as a member or send Authorization: Bearer <ADMIN_PASSWORD>");
  const id = new URL(req.url).searchParams.get("post_id") || "";
  if (!/^\d+$/.test(id)) return err(400, "post_id must be a record id");
  const comments = await query("select * from comments where post_id=$1 and not hidden order by best desc, created_at, id", [Number(id)]);
  return json({ count: comments.length, comments });
});

// POST /api/comments  {post_id, author, body}  (any member or admin)
export const POST = handle(async (req: Request) => {
  if (!(await siteAccess(req))) return err(401, "Sign in as a member or send Authorization: Bearer <ADMIN_PASSWORD>");
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  const postId = Number(b.post_id), author = String(b.author ?? "").trim(), text = String(b.body ?? "").trim();
  if (!Number.isInteger(postId) || postId <= 0) return err(400, "post_id must be a record id");
  if (!author) return err(400, "author is required");
  if (!text) return err(400, "body is required");
  const [post] = await query("select id from records where id=$1 and type='updates'", [postId]);
  if (!post) return err(404, "No feed post with that id");
  const [comment] = await query("insert into comments(post_id,author,body) values($1,$2,$3) returning *", [postId, author.slice(0, 120), text.slice(0, 5000)]);
  return json(comment, 201);
});
