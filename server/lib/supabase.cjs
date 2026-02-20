const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL or SUPABASE_SERVICE_KEY is not defined in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
