import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useRoute, Link } from "wouter";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { useApi } from "@workspace/api-client-react";
import ReactMarkdown from "react-markdown";

interface Blog {
  id: string;
  slug: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export function BlogPost() {
  const [, params] = useRoute("/knowledgebase/:slug");
  const slug = params?.slug;
  const api = useApi();
  const [post, setPost] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api(`/api/blog/${slug}`)
      .then((data: any) => {
        let p = data.post;
        if (typeof p === "string") {
          try { p = JSON.parse(p); } catch (e) {}
        }
        setPost(p);
      })
      .catch((err: any) => setError("Article not found or unavailable."))
      .finally(() => setLoading(false));
  }, [api, slug]);

  return (
    <PageLayout>
      <div className="bg-[#F8FAFF] py-16 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/knowledgebase">
            <a className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Knowledgebase
            </a>
          </Link>
          
          {loading ? (
            <div className="animate-pulse h-12 bg-gray-200 rounded w-3/4 mb-4"></div>
          ) : error ? (
            <h1 className="text-4xl font-bold text-red-600">Error</h1>
          ) : post ? (
            <>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">{post.title}</h1>
              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  {post.authorName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        ) : error ? (
          <div className="text-gray-500">{error}</div>
        ) : post ? (
          <article className="prose prose-lg prose-blue max-w-none prose-headings:font-bold prose-a:text-blue-600">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </article>
        ) : null}
      </div>
    </PageLayout>
  );
}
