import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";
import { Redis } from "@upstash/redis";

const router = Router();

// Redis setup using Upstash (compatible with Cloudflare Workers / Node via HTTP)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://example.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "example_token",
});

// Helper to determine if Redis is properly configured
const isRedisConfigured = () => {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
};

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Get all published blog posts
router.get("/blog", async (req, res) => {
  try {
    const cacheKey = "blog:posts:all";
    if (isRedisConfigured()) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ ok: true, posts: cached });
    }

    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        authorName: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        // we exclude 'content' to keep the list lightweight
      },
    });

    if (isRedisConfigured()) {
      await redis.setex(cacheKey, 60 * 60, JSON.stringify(posts)); // Cache for 1 hour
    }

    res.json({ ok: true, posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single published blog post by slug
router.get("/blog/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `blog:post:${slug}`;

    if (isRedisConfigured()) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ ok: true, post: cached });
    }

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post || !post.published) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (isRedisConfigured()) {
      await redis.setex(cacheKey, 60 * 60, JSON.stringify(post));
    }

    res.json({ ok: true, post });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

const clearBlogCache = async () => {
  if (isRedisConfigured()) {
    // Delete the 'all' cache
    await redis.del("blog:posts:all");
    // Getting keys to delete individual posts might be expensive, 
    // better to let them expire or explicitly delete if needed.
    // For now we just delete the main index cache.
  }
};

router.get("/admin/blog", requireRole("ADMIN"), async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ ok: true, posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/blog/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ ok: true, post });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/blog", requireRole("ADMIN"), async (req: any, res) => {
  try {
    const { title, slug, excerpt, content, published } = req.body;
    
    // Fallback if the user doesn't have a name in clerk, though they should as ADMIN
    const authorName = req.auth?.claims?.first_name 
      ? `${req.auth.claims.first_name} ${req.auth.claims.last_name || ""}`.trim()
      : "Admin";

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        authorName,
        published: !!published,
      },
    });

    await clearBlogCache();
    res.json({ ok: true, post });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "A post with this slug already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/blog/:id", requireRole("ADMIN"), async (req: any, res) => {
  try {
    const { title, slug, excerpt, content, published } = req.body;
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        title,
        slug,
        excerpt,
        content,
        published,
      },
    });

    await clearBlogCache();
    if (isRedisConfigured()) {
      await redis.del(`blog:post:${slug}`); // Also delete specific post cache
    }

    res.json({ ok: true, post });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/blog/:id", requireRole("ADMIN"), async (req: any, res) => {
  try {
    const post = await prisma.blogPost.delete({
      where: { id: req.params.id },
    });

    await clearBlogCache();
    if (isRedisConfigured()) {
      await redis.del(`blog:post:${post.slug}`);
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
