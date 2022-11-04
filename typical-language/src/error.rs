use core::fmt;

use colored::Colorize;

pub struct Solution {
    pub text: String,
    pub src: String,
}

pub struct Source {
    pub file: String,
    pub line: usize,
    pub start: usize,
    pub end: usize,
    pub code: Option<String>,
    pub source_object: String,
}

pub struct Error {
    pub name: Errors,
    pub message: String,
    pub source: Source,
    pub solution: Solution,
    pub tips: Vec<String>,
    pub pointers: Vec<Pointer>
}

pub struct Pointer {
    pub text: String,
    pub start: usize,
    pub end: usize
}

pub const ALIASES: &[(&'static str, &'static str)] = &[("import", "requires"), ("class", "object"), ("define", "declare")];
pub const SUGGESTIONS: &[&'static str] = &["requires", "template", "declare", "object", "extend"];

#[derive(Debug, PartialEq)]
pub enum Errors {
    // when something is wrong with type usage (wrong variable type, wrong return type etc.)
    TypeError,

    // When bad syntax
    SyntaxError, 

    // When wrong value
    ValueError,
    
    // when compiler commits suicide
    CompilationError,

    // for throw (`!> "example error"`)
    Error,

    // for assert (`!> Bool`)
    AssertionError,

    // when module is not found or module has an error in it
    ImportError,

    // when variable/method/object is already defined
    NameError,

    // when object does not implement all required variables and methods from template
    ObjectError,

    // Warning (this error doesn't stops the program form running)
    Warning
}

impl fmt::Display for Errors {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl ToString for Error {
    fn to_string(&self) -> String {
        format!(
            "{}: {}",
            self.name.to_string().red().underline().bold(),
            self.message
        )
    }
}

impl Error {
    pub fn new(name: Errors, message: &str, source: Source) -> Self {
        Self {
            name,
            message: message.to_string(),
            source,
            solution: Solution {
                text: String::new(),
                src: String::new(),
            },
            tips: Vec::new(),
            pointers: Vec::new()
        }
    }

    pub fn add_pointer(&mut self, text: &str, start: usize, end: usize) {
        self.pointers.push(Pointer {
            text: text.to_string(),
            start,
            end
        });
    }

    pub fn add_tip(&mut self, text: &str) {
        self.tips.push(text.to_string());
    }

    pub fn set_solution(&mut self, text: &str, src: Option<&str>) {
        self.solution.text = text.to_string();
        match src {
            Some(x) => self.solution.src = x.to_string(),
            None => {}
        };
    }

    pub fn throw(&mut self) -> ! {
        self.print();
        std::process::exit(-1)
    }

    pub fn print(&mut self) {
        // TODO: replace this with fmt::Display
        let mut message: Vec<String> = Vec::new();

        // if self.name == Errors::Warning {
        //     message.push(format!(
        //         "\n{}: {}\n  {in_w} {}:{}\n  {in_w} {}",
        //         self.name.to_string().bright_yellow().bold(),
        //         self.message,
        //         self.source.file.white(),
        //         self.source.line.to_string().white(),
        //         self.source.source_object.white(),
    
        //         in_w = "in".bright_black()
        //     ));
        // } else {
        //     message.push(format!(
        //         "\n{}\n  {in_w} {}:{}\n  {in_w} {}",
        //         self.name.to_string().red().bold(),
        //         self.source.file.white(),
        //         self.source.line.to_string().white(),
        //         self.source.source_object.white(),
    
        //         in_w = "in".bright_black()
        //     ));
        // }

        message.push(format!(
            "\n{}: {}",
            if self.name == Errors::Warning { self.name.to_string().bright_yellow().bold() } else { self.name.to_string().red().bold() },
            self.message.bold()
        ));

        match &self.source.code {
            Some(x) => {
                let mut pointers_fmt = String::new();
                let mut source: Vec<String> = Vec::new();
                let mut arrows: Vec<char> = "─".repeat(x.len()).chars().collect();
                let mut last_pointer_end: usize = 0;

                if self.pointers.len() == 0 {
                    self.pointers.push(Pointer {
                        text: "here".to_string(),
                        start: self.source.start,
                        end: self.source.end
                    });
                }
                
                for i in 0..self.pointers.len() {
                    let pointer = &self.pointers[i];
                    arrows[pointer.start] = '┬';
                    if last_pointer_end != pointer.end {
                        source.push(x[last_pointer_end..pointer.start].to_string());
                        source.push(x[pointer.start..pointer.end].underline().to_string());
                        last_pointer_end = pointer.end;
                    }
                    if i >= self.pointers.len()-1 {
                        source.push(x[pointer.end..].to_string());
                    }
                    pointers_fmt += &format!(
                        "{}     {}{}{} {}\n",
                        
                        " ".repeat(self.source.line.to_string().len()+1),
                        " ".repeat(pointer.start),
                        if self.pointers[i..]
                            .into_iter()
                            .filter(|x| x.start == pointer.start && x.end == pointer.end)
                            .collect::<Vec<_>>()
                            .len() > 1
                             { "├" }
                        else { "╰" },
                        "─".repeat(i*2 + 1),
                        self.pointers[i].text
                    );
                }

                message.push(format!(
                    "\n{ln_spaces}{vbar_start}{hbar}{hbar}[{file}:{obj}]\n{ln_spaces}{vbar}\n {line:01}{vbar}    {source}\n{ln_spaces}{vbar}\n{ln_spaces}{vbar_end}{vbar_end_arr}{arrows}\n{pointers}",
                    
                    file = self.source.file.white(),
                    obj = self.source.source_object.white(),
                    // arrows = ("─".repeat(self.source.start)
                    //           + (if self.pointers.len() > 0 { &"┼" } else { &"" })
                    //           + &"─".repeat(x.len() - self.source.end))
                    //           .blue().bold(),
                    arrows = arrows.into_iter().collect::<String>().blue().bold(),
                    // source = format!("{}{}{}", &x.trim()[..self.source.start], &x.trim()[self.source.start..self.source.end].underline(), &x.trim()[self.source.end..]),
                    source = source.join(""),
                    line = self.source.line.to_string().blue().bold(),
                    ln_spaces = " ".repeat(self.source.line.to_string().len()+1),
                    hbar = "─".blue().bold(),
                    vbar = "│".blue().bold(),
                    vbar_start = "╭".blue().bold(),
                    vbar_end = "╰".blue().bold(),
                    vbar_end_arr = "────".blue().bold(),
                    pointers = pointers_fmt.blue().bold()
                ));
            }
            None => message.push(format!(
                "  {} {}:{}\n  {} {}",

                "├─".blue(),
                self.source.file.white(),
                self.source.line.to_string().white(),
                "╰───".blue(),
                self.source.source_object.white()
            ))
        }

        // if self.name != Errors::Warning {
        //     message.push(format!("\n{}", self.message.bold()));
        // }

        if !self.solution.text.is_empty() {
            if !self.solution.src.is_empty() {
                message.push(format!(
                    "{}:",
                    self.solution.text
                ));
                message.push(format!("\t{}\n", self.solution.src.white()));
            } else {
                message.push(format!(
                    "{}",
                    self.solution.text
                ));
            }
        }

        if self.tips.len() > 0 {
            for tip in &self.tips {
                message.push(format!(
                    "  {} {}",
                    "■ tip:".bright_yellow().bold(),
                    tip.replace("\n", "\n         ")
                ));
            }
        }

        if self.name == Errors::Warning {
            message.push("\n".to_string());
        }

        println!("{}", message.join("\n"));
    }
}

/*
** Example Usage:

let mut err = Error::new(
        Errors::TypeError,
        "String does not support operation \"+\" with type Int",
        Source { file: "a/b/c/d.src".to_string(), line: 5, start: 12, end: 18, code: Some("    std.output(\"2\" + 2)".to_string()), source_object: "Program:main".to_string() });
err.set_solution("Convert type String to type Int", Some("(\"string\" -> Int)"));
err.print();
*/
