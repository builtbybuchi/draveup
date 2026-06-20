import { useEffect, useState } from "react";
import { useApi } from "../api";
import { PlusCircle, Edit, Trash, Eye, X } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  authorName: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export function BlogsPage() {
  const api = useApi();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    published: false,
  });

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const res = await api("/api/admin/blog");
      setBlogs(res.posts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentBlog.id) {
        await api(`/api/admin/blog/${currentBlog.id}`, {
          method: "PUT",
          body: JSON.stringify(currentBlog),
        });
      } else {
        await api("/api/admin/blog", {
          method: "POST",
          body: JSON.stringify(currentBlog),
        });
      }
      setIsEditing(false);
      loadBlogs();
    } catch (err: any) {
      alert("Failed to save blog: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    try {
      await api(`/api/admin/blog/${id}`, { method: "DELETE" });
      loadBlogs();
    } catch (err: any) {
      alert("Failed to delete blog: " + err.message);
    }
  };

  const openEditor = (blog?: BlogPost) => {
    if (blog) {
      setCurrentBlog(blog);
    } else {
      setCurrentBlog({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        published: false,
      });
    }
    setIsEditing(true);
  };

  if (loading && !isEditing) return <div className="p-8 text-center text-slate-500">Loading blogs...</div>;
  if (error && !isEditing) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Knowledgebase &amp; Blogs</h2>
          <p className="text-slate-500 text-sm mt-1">Manage articles for the public knowledgebase.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
          >
            <PlusCircle className="w-4 h-4" />
            New Post
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">{currentBlog.id ? "Edit Post" : "Create New Post"}</h3>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={currentBlog.title || ""}
                  onChange={(e) => {
                    const title = e.target.value;
                    setCurrentBlog({ 
                      ...currentBlog, 
                      title, 
                      slug: !currentBlog.id ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : currentBlog.slug 
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="How to register a domain"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  required
                  type="text"
                  value={currentBlog.slug || ""}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="how-to-register-a-domain"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Excerpt (Optional)</label>
              <input
                type="text"
                value={currentBlog.excerpt || ""}
                onChange={(e) => setCurrentBlog({ ...currentBlog, excerpt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="A short description of the article..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content (Markdown)</label>
              <textarea
                required
                rows={15}
                value={currentBlog.content || ""}
                onChange={(e) => setCurrentBlog({ ...currentBlog, content: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                placeholder="# Heading 1&#10;&#10;Write your markdown content here..."
              ></textarea>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={currentBlog.published || false}
                onChange={(e) => setCurrentBlog({ ...currentBlog, published: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="published" className="text-sm font-medium text-slate-700">
                Published
              </label>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
              >
                Save Post
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No blog posts yet. Click "New Post" to create one.
                  </td>
                </tr>
              ) : (
                blogs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{b.title}</div>
                      <div className="text-xs text-slate-500">/{b.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.authorName}</td>
                    <td className="px-4 py-3 text-center">
                      {b.published ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Published</span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditor(b)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
