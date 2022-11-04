use std;

use crate::lexer::Lexer;
use crate::rules::RULES;

mod ast;
mod error;
mod lexer;
mod rules;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        println!("Please specify the file");
        std::process::exit(-1);
    }
    
    let mut input = std::fs::read_to_string(&args[1]).unwrap();
    let input_static = input.clone();

    let mut lexer = Lexer::build(RULES.to_owned(), &input_static);

    let toplevel = lexer.parse_type(&mut input);

    println!("{:?}", toplevel)
}
