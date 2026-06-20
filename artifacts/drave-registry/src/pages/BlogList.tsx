import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Link } from "wouter";
import { BookOpen, Calendar, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "@/lib/api";

interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  createdAt: string;
}

export function BlogList() {
  const { t } = useTranslation(['common']);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/blog"))
      .then((r) => r.json())
      .then((data: any) => {
        let posts = data.posts;
        if (typeof posts === "string") {
          try { posts = JSON.parse(posts); } catch (e) {}
        }
        setBlogs(posts || []);
      })
      .catch((err: any) => console.error("Failed to load blogs:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="bg-[#F8FAFF] py-20 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Knowledgebase &amp; Guides</h1>
          <p className="text-xl text-gray-600">
            Learn how to manage your domains, configure email, and scale your online presence.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading articles...</div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white border border-gray-200 rounded-2xl">
            No articles published yet. Check back soon!
          </div>
        ) : (
          <div className="space-y-8">
            {blogs.map((b) => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <Link href={`/knowledgebase/${b.slug}`} className="block group">
                    <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3">
                      {b.title}
                    </h2>
                    {b.excerpt && <p className="text-gray-600 mb-6 leading-relaxed">{b.excerpt}</p>}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {b.authorName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-blue-600 font-semibold group-hover:underline ml-auto">
                        Read Article &rarr;
                      </div>
                    </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
