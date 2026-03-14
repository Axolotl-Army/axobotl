// Force Next.js standalone file tracer to include pg and pg-hstore.
// Sequelize dynamically requires its dialect driver at runtime, which
// @vercel/nft cannot trace. This static import makes the tracer pick
// up pg (and its transitive deps) so they ship in the standalone output.
import 'pg';
