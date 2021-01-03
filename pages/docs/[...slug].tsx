import fs from 'fs'
import matter from 'gray-matter'
import hydrate from 'next-mdx-remote/hydrate'
import renderToString from 'next-mdx-remote/render-to-string'
import path from 'path'
import { getDocsPaths, DOCS_PATH } from 'utils/mdxUtils'
import recursiveReaddir from 'recursive-readdir';
import makeNav from 'lib/getSidebarNav'
import Layout from 'components/Layout'
import slugify from '@sindresorhus/slugify'

const components = {
  Callout: ({children}) => children,
  Bleed: ({children}) => children,
  Heading: ({children, id}) => {
    return <a href={`#${id}`}><h2>{children}</h2></a>
  }
}

export default function PostPage({ toc, source, nav, frontMatter }) {
  const content = hydrate(source, { components })
  
  return (
    <Layout nav={nav} toc={toc}>
      <div className="post-header">
        <h1>{frontMatter.title}</h1>
        {frontMatter.description && (
          <p className="description">{frontMatter.description}</p>
        )}
      </div>
      <main>{content}</main>
    </Layout>
  )
}

export const getStaticProps = async ({ params }) => {
  const postFilePath = path.join(DOCS_PATH, `${params.slug.join('/')}.mdx`)
  const source = fs.readFileSync(postFilePath)
  const { content, data } = matter(source)
  const nav = makeNav((await getDocsPaths()).map(x => x.replace('/docs/', '').replace('.mdx', '')))

  const toc = []
  const mdxSource = await renderToString(content, {
    components,
    // Optionally pass remark/rehype plugins
    mdxOptions: {
      remarkPlugins: [ () => function test(tree) {
        // @ts-ignore
        for (let i = 0; i < tree.children.length; i++) {
          
          let node = tree.children[i]
          if(node.type === "heading" && [2].includes(node.depth)) {
            const title = node.children
              .filter((n) => n.type === 'text')
              .map((n) => n.value)
              .join('')
            
            const slug = slugify(title)

            node.type = 'jsx'
            node.value = `<Heading id={"${slug}"}>${title}</Heading>`

            toc.push({ slug, title })
          }

        }

        // (tree.children as Record<string, any>[]).push({
        //   type: 'export',
        //   default: true,
        //   value: `export default {
        //     toc: ${JSON.stringify(content)}
        //   }`
        // })
        
        return tree
      }
      ],
      rehypePlugins: [],
    },
    scope: data,
  })

  return {
    props: {
      nav,
      toc,
      source: mdxSource,
      frontMatter: data,
    },
  }
}

export const getStaticPaths = async () => {
  const paths = (await getDocsPaths())
    // Remove file extensions for page paths
    .map((path) => path.replace(/\.mdx?$/, ''))
    .map((path) => path.replace("/docs/", ''))
    // Map the path into the static paths object required by Next.js
    .map((path) => {
      return { 
        params: { 
          slug:  path.split('/')
        } 
      }
    })

  return {
    paths,
    fallback: false,
  }
}