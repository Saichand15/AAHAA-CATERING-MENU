import Link from "next/link";
export default function NotFound() {
  return <main className="center-page"><div className="panel"><span className="eyebrow">404</span><h1>Not on the menu.</h1><p>This page could not be found.</p><Link className="button" href="/">Back to the menu</Link></div></main>;
}
