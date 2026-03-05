const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bgifebyzxnvpghljmiad.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnaWZlYnl6eG52cGdobGptaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Njc0NDcsImV4cCI6MjA4NjM0MzQ0N30.OaMa9RRjHhH23iW34u8Py47UludSZsij8R02Vz-HAIc');

async function test() {
    const { data, error } = await supabase.from('chollos').select('*, proveedores(nombre), categorias(nombre, slug)').limit(1);
    if (error) {
        console.error("Error with categorias:", error.message);
        const { data: data2 } = await supabase.from('chollos').select('*, proveedores(nombre), categoria(nombre, slug)').limit(1);
        console.log("With categoria:", JSON.stringify(data2, null, 2));
    } else {
        console.log("With categorias:", JSON.stringify(data, null, 2));
    }
}
test();
