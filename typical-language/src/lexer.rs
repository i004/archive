use crate::error::{Error, Errors, Source, ALIASES, SUGGESTIONS};
use colored::Colorize;
use fancy_regex::Regex;
use if_chain::if_chain;
use std::fmt::{Debug, Display, Formatter, Result};
use std::io::Read;
use std::ops::{Index, Range};

use crate::ast::{
    Expr, Exprs, FnCallInner, Import, StringFlags, StringInner, TopLevel, Type, Types, Value,
    Values,
};

// oh god there's already too many lines
// what about splitting this file into multiple files? (PLS NO)

#[derive(Copy, Clone, PartialEq, PartialOrd)]
pub struct Spanned<T> {
    pub span: Span,
    pub data: T,
}

impl<T: Debug> Debug for Spanned<T> {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        write!(
            f,
            "{}..{} @ {:?}",
            self.span.start, self.span.end, self.data
        )
    }
}

impl<T> Spanned<T> {
    pub fn content<'a>(&self, source: &'a str) -> Option<&'a str> {
        source.get(self.clone().span.as_range())
    }
}

pub type Token = Spanned<Tokens>;

#[derive(Clone, Copy, Debug, PartialEq, PartialOrd)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

impl Span {
    pub fn len(self) -> usize {
        self.end - self.start
    }

    #[inline]
    pub fn new(start: usize, end: usize) -> Span {
        Span { start, end }
    }

    pub fn as_range(&self) -> Range<usize> {
        self.start..self.end
    }
}

impl Index<Span> for String {
    type Output = str;

    #[inline]
    fn index(&self, index: Span) -> &Self::Output {
        &self[index.start..index.end]
    }
}

impl Index<Span> for str {
    type Output = str;

    #[inline]
    fn index(&self, index: Span) -> &Self::Output {
        &self[index.start..index.end]
    }
}

impl Display for Span {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        write!(f, "({}, {})", self.start, self.end)
    }
}

#[derive(Clone, Debug)]
pub struct Rule {
    pub kind: Tokens,
    pub re: Regex,
}

#[derive(Debug, Clone)]
pub struct Lexer<'a> {
    rules: [Rule; 78],
    input: &'a String,
    pos: usize,
    pub consumed_len: usize,
}

impl<'a> Lexer<'a> {
    #[inline]
    pub fn next(&mut self, input: &mut String) -> Option<Token> {
        let next = self.next_token(input);

        match next.data {
            Tokens::Newline => {
                self.pos += 1;
                self.consumed_len -= 1;
                self.next(input)
            }
            Tokens::Whitespace => self.next(input),
            Tokens::Unknown => None,
            _ => Some(next),
        }
    }

    pub fn peek(&mut self, input: &String) -> Option<Token> {
        let mut peek_str = input.clone();
        let mut s = self.clone();

        let peek = s.next(&mut peek_str);
        s.consumed_len -= (&peek)
            .unwrap_or(Token {
                data: Tokens::Unknown,
                span: Span::new(0, 0),
            })
            .span
            .len();

        peek
    }
}

#[derive(Clone, Copy, Debug, PartialEq, PartialOrd)]
#[repr(u8)]
pub enum Tokens {
    // Single char tokens
    Dot,
    Comma,
    RSquare,
    LSquare,
    RParen,
    LParen,
    RCurly,
    LCurly,
    Plus,
    Minus,
    Percent,
    Equals,
    Bang,
    Question,
    LessThan,
    GreaterThan,
    ForwardSlash,
    BitOr,
    BitAnd,
    Semicolon,
    Colon,
    Dollar,
    At,
    Hash,
    Star,
    Xor,

    // Double char tokens
    Comment,
    MultilineComment,
    PipeLine,
    ThrowError,
    LogicalOr,
    LogicalAnd,
    LogicalEq,
    Arrow,
    FatArrow,

    // Variable length
    Int,
    Float,
    Identifier,
    String,
    Char,

    // Keywords
    Return,
    For,
    While,
    In,
    Else,
    Match,
    Break,
    Continue,
    Object,
    Requires,
    Null,
    Package,
    Declare,
    New,
    Const,
    Type,
    Template,
    Method,
    Uses,
    True,
    False,
    Enum,
    Public,
    Private,
    Operator,
    Extend,
    Static,
    Override,
    With,

    // Types
    StringType,
    CharType,
    IntType,
    FloatType,
    BoolType,
    ArrayType,
    DictType,

    Whitespace,
    Newline,
    Unknown,
}

impl std::fmt::Display for Tokens {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl<'a> Lexer<'a> {
    #[inline]
    pub fn build(rules: [Rule; 78], input: &'a String) -> Self {
        Lexer {
            rules,
            input,
            pos: 0,
            consumed_len: 0,
        }
    }

    #[inline]
    pub fn get_line(&self) -> &str {
        self.input.split("\n").nth(self.pos).unwrap()
    }

    #[inline]
    fn next_token(&mut self, input: &mut String) -> Token {
        let out = self
            .token_valid(&input)
            .unwrap_or_else(|| self.token_invalid(&input));

        *input = input[out.span.len()..].to_string();

        out
    }

    fn token_valid(&mut self, input: &str) -> Option<Token> {
        let longest = self
            .rules
            .iter()
            .rev()
            .filter_map(|rule| {
                let mch = rule.re.find(input).unwrap()?;
                Some((mch.end(), rule))
            })
            .max_by_key(|&(len, _)| len)?;

        let (len, rule) = longest;
        let prev_len = self.consumed_len;
        self.consumed_len += len;
        let token_span = Span::new(prev_len, self.consumed_len);
        let kind_cl = rule.kind.clone();
        assert!(
            len > 0,
            "Bad token\nkind: {:?}\nregex: {:?}\ninput {:?}",
            rule.kind,
            rule.re,
            input
        );
        Some(Token {
            data: kind_cl,
            span: token_span,
        })
    }

    fn token_invalid(&mut self, input: &str) -> Token {
        let mut len = 0;
        let prev_len = self.consumed_len;
        for c in input.chars() {
            len += c.len_utf8();
            if self.token_valid(&input[len..]).is_some() {
                break;
            }
        }
        self.consumed_len += len;
        Token {
            data: Tokens::Unknown,
            span: Span::new(prev_len, self.consumed_len),
        }
    }

    pub fn parse_type(&mut self, input: &mut String) -> Type {
        if let Some(token) = self.next(input) {
            match token.data {
                Tokens::StringType => Type {
                    data: Types::String,
                    span: token.span,
                },
                Tokens::CharType => Type {
                    data: Types::Char,
                    span: token.span,
                },
                Tokens::IntType => Type {
                    data: Types::Int,
                    span: token.span,
                },
                Tokens::FloatType => Type {
                    data: Types::Float,
                    span: token.span,
                },
                Tokens::BoolType => Type {
                    data: Types::Bool,
                    span: token.span,
                },
                Tokens::ArrayType => {
                    if let Some(next) = self.next(input) {
                        if next.data == Tokens::LessThan {
                            let t = Box::new(self.parse_type(input));

                            if let Some(peek) = self.peek(input) {
                                if peek.data == Tokens::GreaterThan {
                                    return Type {
                                        data: Types::Array(t),
                                        span: token.span,
                                    };
                                } else if peek.data == Tokens::Comma {
                                    // Unexpected extra type
                                    let mut error = Error::new(
                                        Errors::TypeError,
                                        &format!("Unexpected extra type"),
                                        Source {
                                            file: "yes".to_string(),
                                            line: 1,
                                            start: peek.span.start,
                                            end: peek.span.end,
                                            code: Some(self.get_line().to_string()),
                                            source_object: "TopLevel".to_string()
                                        }
                                    );
                                    error.add_pointer("expected only one type", peek.span.start, peek.span.end);
                                    error.set_solution(
                                        "Consider using only one type",
                                        Some(&format!(
                                            "{}{}",

                                            &self.get_line().to_string()[..peek.span.start],
                                            ">".bold()
                                        ))
                                    );
                                    error.throw();
                                } else {
                                    // Unexpected token
                                    let mut error = Error::new(
                                        Errors::SyntaxError,
                                        &format!("Unexpected token {}", peek.data.to_owned().to_string()),
                                        Source {
                                            file: "yes".to_string(),
                                            line: 1,
                                            start: peek.span.start,
                                            end: peek.span.end,
                                            code: Some(self.get_line().to_string()),
                                            source_object: "TopLevel".to_string()
                                        }
                                    );
                                    error.add_pointer("expected token GreaterThan", peek.span.start, peek.span.end);
                                    error.set_solution(
                                        "Consider removing this token",
                                        Some(&format!(
                                            "{}{}{}",

                                            &self.get_line().to_string()[..peek.span.start],
                                            &self.get_line().to_string()[peek.span.start..peek.span.end].strikethrough(),
                                            &self.get_line().to_string()[peek.span.end..],
                                        ))
                                    );
                                    error.throw();
                                }
                            }

                            // Unexpected end of input
                            let mut error = Error::new(
                                Errors::SyntaxError,
                                &format!("Unexpected end of input"),
                                Source {
                                    file: "yes".to_string(),
                                    line: 1,
                                    start: next.span.start,
                                    end: next.span.end,
                                    code: Some(self.get_line().to_string()),
                                    source_object: "TopLevel".to_string()
                                }
                            );
                            error.add_pointer("expected token GreaterThan", next.span.start, next.span.end);
                            error.set_solution(
                                "Determine type of array elements",
                                Some(&format!(
                                    "Array{}",
    
                                    "<Type>".bold()
                                ))
                            );
                            error.throw();
                        } else {
                            // Unexpected token
                            let mut error = Error::new(
                                Errors::SyntaxError,
                                &format!("Unexpected token {}", next.data.to_owned().to_string()),
                                Source {
                                    file: "yes".to_string(),
                                    line: 1,
                                    start: next.span.start,
                                    end: next.span.end,
                                    code: Some(self.get_line().to_string()),
                                    source_object: "TopLevel".to_string()
                                }
                            );
                            error.add_pointer("expected token LessThan", next.span.start, next.span.end);
                            error.set_solution(
                                "Determine type of array elements",
                                Some(&format!(
                                    "Array{}",
    
                                    "<Type>".bold()
                                ))
                            );
                            error.throw();
                        }
                    } else {
                        let mut error = Error::new(
                            Errors::SyntaxError,
                            "Unexpected end of input",
                            Source {
                                file: "yes".to_string(),
                                line: 1,
                                start: token.span.start,
                                end: token.span.end,
                                code: Some(self.get_line().to_string()),
                                source_object: "TopLevel".to_string()
                            }
                        );
                        error.add_pointer("Array was used here", token.span.start, token.span.end);
                        error.add_pointer("expected type", token.span.start+1, token.span.end+1);
                        error.set_solution(
                            "Determine type of array elements",
                            Some(&format!(
                                "Array{}",

                                "<Type>".bold()
                            ))
                        );
                        error.throw();
                    }
                }
                Tokens::DictType => {
                    if let Some(next) = self.next(input) {
                        if next.data == Tokens::LessThan {
                            let (t1, t2);

                            t1 = Box::new(self.parse_type(input));

                            if self.peek(input).is_some()
                                && self.peek(input).unwrap().data != Tokens::Comma
                            {
                                let peek = self.peek(input).unwrap();
                                // Unexpected token
                                let mut error = Error::new(
                                    Errors::SyntaxError,
                                    &format!("Unexpected token {}", peek.data.to_string()),
                                    Source {
                                        file: "yes".to_string(),
                                        line: 1,
                                        start: peek.span.start,
                                        end: peek.span.end,
                                        code: Some(self.get_line().to_string()),
                                        source_object: "TopLevel".to_string()
                                    }
                                );
                                error.add_pointer("Dict was used here", token.span.start, token.span.end);
                                error.add_pointer("expected token Comma", peek.span.start, peek.span.end);
                                error.add_pointer("expected value type definition", peek.span.start, peek.span.end);
                                error.set_solution(
                                    "Determine type of dict values",
                                    Some(&format!(
                                        "{}{}",
        
                                        &self.get_line()[..peek.span.start],
                                        ", Type2>".bold()
                                    ))
                                );
                                error.throw();
                            }
                            self.next(input);
                            t2 = Box::new(self.parse_type(input));

                            if let Some(peek) = self.peek(input) {
                                if peek.data == Tokens::GreaterThan {
                                    return Type {
                                        data: Types::Dict((t1, t2)),
                                        span: token.span,
                                    };
                                } else if peek.data == Tokens::Comma {
                                    let mut error = Error::new(
                                        Errors::SyntaxError,
                                        "Unexpected extra type",
                                        Source {
                                            file: "yes".to_string(),
                                            line: 1,
                                            start: peek.span.start,
                                            end: peek.span.end,
                                            code: Some(self.get_line().to_string()),
                                            source_object: "TopLevel".to_string()
                                        }
                                    );
                                    error.add_pointer("Dict was used here", token.span.start, token.span.end);
                                    error.add_pointer("expected token GreaterThan", peek.span.start, peek.span.end);
                                    error.add_pointer("expected only two types", peek.span.start, peek.span.end);
                                    error.set_solution(
                                        "Dict needs to have only two types",
                                        Some(&format!(
                                            "{}{}",
            
                                            &self.get_line()[..peek.span.start],
                                            ">".bold()
                                        ))
                                    );
                                    error.throw();
                                } else {
                                    let mut error = Error::new(
                                        Errors::SyntaxError,
                                        &format!("Unexpected token {}", peek.data.to_string()),
                                        Source {
                                            file: "yes".to_string(),
                                            line: 1,
                                            start: peek.span.start,
                                            end: peek.span.end,
                                            code: Some(self.get_line().to_string()),
                                            source_object: "TopLevel".to_string()
                                        }
                                    );
                                    error.add_pointer("Dict was used here", token.span.start, token.span.end);
                                    error.add_pointer("expected token GreaterThan", peek.span.start, peek.span.end);
                                    error.add_pointer("expected only two types", peek.span.start, peek.span.end);
                                    error.set_solution(
                                        "Consider removing this token:",
                                        Some(&format!(
                                            "{}{}{}",
            
                                            &self.get_line()[..peek.span.start],
                                            &self.get_line()[peek.span.start..peek.span.end].strikethrough(),
                                            &self.get_line()[peek.span.end..],
                                        ))
                                    );
                                    error.throw();
                                }
                            }

                            // Unexpected end of input
                            let mut error = Error::new(
                                Errors::SyntaxError,
                                "Unexpected end of input",
                                Source {
                                    file: "yes".to_string(),
                                    line: 1,
                                    start: next.span.start,
                                    end: next.span.end,
                                    code: Some(self.get_line().to_string()),
                                    source_object: "TopLevel".to_string()
                                }
                            );
                            error.add_pointer("Dict was used here", token.span.start, token.span.end);
                            error.add_pointer("expected token GreaterThan", next.span.start, next.span.end);
                            error.set_solution(
                                "Determine type of dict keys and values",
                                Some(&format!(
                                    "Dict{}",
    
                                    "<Type1, Type2>".bold()
                                ))
                            );
                            error.throw();
                        } else {
                            let mut error = Error::new(
                                Errors::SyntaxError,
                                &format!("Unexpected token {}", next.data.to_string()),
                                Source {
                                    file: "yes".to_string(),
                                    line: 1,
                                    start: next.span.start,
                                    end: next.span.end,
                                    code: Some(self.get_line().to_string()),
                                    source_object: "TopLevel".to_string()
                                }
                            );
                            error.add_pointer("Dict was used here", token.span.start, token.span.end);
                            error.add_pointer("expected token LessThan", next.span.start, next.span.end);
                            error.add_pointer("expected key type", next.span.start, next.span.end);
                            error.add_pointer("expected value type", next.span.start, next.span.end);
                            error.set_solution(
                                "Determine type of dict keys and values",
                                Some(&format!(
                                    "Dict{}",
    
                                    "<Type1, Type2>".bold()
                                ))
                            );
                            error.throw();
                        }
                    } else {
                        let mut error = Error::new(
                            Errors::SyntaxError,
                            "Unexpected end of input",
                            Source {
                                file: "yes".to_string(),
                                line: 1,
                                start: token.span.start,
                                end: token.span.end,
                                code: Some(self.get_line().to_string()),
                                source_object: "TopLevel".to_string()
                            }
                        );
                        error.add_pointer("Dict was used here", token.span.start, token.span.end);
                        error.add_pointer("expected key type", token.span.start+1, token.span.end+1);
                        error.add_pointer("expected value type", token.span.start+1, token.span.end+1);
                        error.set_solution(
                            "Determine type of dict keys and values",
                            Some(&format!(
                                "Dict{}",

                                "<Type1, Type2>".bold()
                            ))
                        );
                        error.throw();
                    }
                }

                _ => {
                    // Expected type
                    std::process::exit(0)
                }
            }
        } else {
            std::process::exit(0)
        }
    }

    #[inline]
    pub fn parse_expr(&mut self, input: &mut String) -> Option<Expr<'a>> {
        if let Some(token) = self.next(input) {
            match token.data {
                Tokens::Dot => todo!(),
                Tokens::Comma => todo!(),
                Tokens::RSquare => todo!(),
                Tokens::LSquare => todo!(),
                Tokens::RParen => None,
                Tokens::LParen => todo!(),
                Tokens::RCurly => todo!(),
                Tokens::LCurly => todo!(),
                Tokens::Plus => todo!(),
                Tokens::Minus => todo!(),
                Tokens::Percent => todo!(),
                Tokens::Equals => todo!(),
                Tokens::Bang => todo!(),
                Tokens::Question => todo!(),
                Tokens::LessThan => todo!(),
                Tokens::GreaterThan => todo!(),
                Tokens::ForwardSlash => todo!(),
                Tokens::BitOr => todo!(),
                Tokens::BitAnd => todo!(),
                Tokens::Semicolon => todo!(),
                Tokens::Colon => todo!(),
                Tokens::Dollar => todo!(), // php devs be like: <? Tokens::Dollar Tokens::Dollar Tokens::Dollar Tokens::DollarTokens::DollarTokens::Tokens::Dollar ?>
                Tokens::At => todo!(),
                Tokens::Hash => todo!(),
                Tokens::Star => todo!(),
                Tokens::Xor => todo!(),
                Tokens::Comment => todo!(),
                Tokens::MultilineComment => todo!(),
                Tokens::PipeLine => todo!(),
                Tokens::ThrowError => todo!(),
                Tokens::LogicalOr => todo!(),
                Tokens::LogicalAnd => todo!(),
                Tokens::LogicalEq => todo!(),
                Tokens::Arrow => todo!(),
                Tokens::Operator => todo!(),
                Tokens::FatArrow => todo!(),
                Tokens::Extend => todo!(),
                Tokens::With => todo!(),
                Tokens::Static => todo!(),
                Tokens::Override => todo!(),
                Tokens::Int => {
                    let raw = token.clone().content(&self.input).unwrap();
                    let out = Expr::new(
                        Exprs::Value(Value {
                            span: token.span,
                            data: Values::Int(raw.parse().unwrap()),
                        }),
                        token.span,
                    );

                    Some(out)
                }
                Tokens::Float => {
                    let raw = token.clone().content(&self.input).unwrap();
                    let data = raw.parse().unwrap();
                    let out = Expr::new(
                        Exprs::Value(Value {
                            span: token.span,
                            data: Values::Float(data),
                        }),
                        token.span,
                    );

                    if data.fract() == 0.0 {
                        let src = Source {
                            file: "yes".to_owned(),
                            line: self.pos + 1,
                            start: token.span.start,
                            end: token.span.end,
                            code: Some(self.get_line().to_string()),
                            source_object: "TopLevel".to_string(),
                        };
                        let mut err = Error::new(
                            Errors::Warning,
                            "Float with empty fraction can be converted to Int without any loss",
                            src,
                        );
                        err.print();
                    }

                    Some(out)
                }
                Tokens::Identifier => {
                    if let Some(peeked_token) = self.peek(input) {
                        match peeked_token.data {
                            Tokens::LParen => {
                                // A function call
                                self.next(input);

                                let mut args = Vec::new();

                                while let Some(ex) = self.parse_expr(input) {
                                    if let Some(pe) = self.peek(input) {
                                        if pe.data == Tokens::Comma {
                                            self.next(input);
                                            args.push(ex);
                                        } else if pe.data == Tokens::RParen {
                                            self.next(input);
                                            args.push(ex);
                                            break;
                                        } else {
                                            let src = Source {
                                                file: "yes".to_owned(),
                                                line: self.pos + 1,
                                                start: pe.span.start,
                                                end: pe.span.end,
                                                code: Some(self.get_line().to_string()),
                                                source_object: "TopLevel".to_string(),
                                            };
                                            let mut err = Error::new(
                                                Errors::SyntaxError,
                                                "Missing token `Comma`",
                                                src,
                                            );
                                            err.add_pointer("expected comma", pe.span.start-1, pe.span.end-1);
                                            err.add_pointer("argument defined here", pe.span.start, pe.span.end);
                                            err.set_solution(
                                                &format!(
                                                    "Consider adding a comma before `{}`",
                                                    pe.content(self.get_line()).unwrap()
                                                ),
                                                Some(&format!(
                                                    "{}{} {}",
                                                    &self.get_line()[..pe.span.start - 1],
                                                    ",".bold(),
                                                    &self.get_line()[pe.span.start..]
                                                )),
                                            );

                                            err.throw();
                                        }
                                    } else {
                                        let src = Source {
                                            file: "yes".to_owned(),
                                            line: self.pos + 1,
                                            start: ex.span.start,
                                            end: ex.span.end,
                                            code: Some(self.get_line().to_string()),
                                            source_object: "TopLevel".to_string(),
                                        };
                                        let mut err = Error::new(
                                            Errors::SyntaxError,
                                            "Unexpected end of input",
                                            src,
                                        );
                                        err.add_pointer("function call here", token.span.start, token.span.end);
                                        err.add_pointer("expected ) after this argument", ex.span.start, ex.span.end);
                                        err.set_solution(
                                            "Consider closing this function call with a `)`",
                                            Some(&format!("{}{}", self.get_line(), ")".bold())),
                                        );
                                        err.throw();
                                    }
                                }

                                let span = Span::new(token.span.start, self.consumed_len);

                                let out = Expr::new(
                                    Exprs::FunctionCall(FnCallInner::new(
                                        token.content(self.get_line()).unwrap().to_string(),
                                        args,
                                    )),
                                    span,
                                );
                                Some(out)
                            }
                            _ => None,
                        }
                    } else {
                        None
                    }
                }
                Tokens::Return => todo!(),
                Tokens::For => todo!(),
                Tokens::While => todo!(),
                Tokens::In => todo!(),
                Tokens::Else => todo!(),
                Tokens::Match => todo!(),
                Tokens::Break => todo!(),
                Tokens::Continue => todo!(),
                Tokens::Object => todo!(),
                Tokens::Requires => todo!(),
                Tokens::Null => todo!(),
                Tokens::Package => todo!(),
                Tokens::Declare => {
                    // if_chain! {
                    //     if let Some(Token {data as visibility, span as vis_span}) = self.next(input);
                    //     if let Some(Token {data as decl_type, span as decl_t_span}) = self.next(input);
                    //     if let Tokens::Public | Tokens::Private = visibility;
                    //     if let Tokens::Const | Tokens::Type = decl_type;

                    //     then {

                    //     } else {

                    //     }
                    // }

                    // TODO: create fn to parse Types from Vec<Tokens>

                    if let Some(Token { data, .. }) = self.next(input) {
                        match data {
                            Tokens::Public | Tokens::Private => {}
                            Tokens::Type => {
                                if let Some(Token { data, .. }) = self.next(input) {
                                    if data == Tokens::Identifier {
                                        if let Some(Token { data, .. }) = self.next(input) {
                                            if data == Tokens::Equals {
                                                // let mut val = Vec::new();

                                                // TODO: parse vec of tokens to TypeInner
                                                // println!("{:?}", val);
                                            }
                                        } else {
                                            // unexpected token
                                        }
                                    } else {
                                        // expect identifier
                                    }
                                }
                            }
                            Tokens::Const => {
                                if let Some(Token { data, .. }) = self.next(input) {
                                    if data == Tokens::Identifier {
                                        if let Some(Token { data, .. }) = self.next(input) {
                                            if data == Tokens::LessThan {
                                            } else {
                                                // expect < for type decl
                                            }
                                        }
                                    } else {
                                        // expect identifier
                                    }
                                }
                            }
                            _ => (),
                        }
                    }

                    None
                }
                Tokens::New => todo!(),
                Tokens::Const => todo!(),
                Tokens::Type => todo!(),
                Tokens::Template => todo!(),
                Tokens::Method => todo!(),
                Tokens::Uses => todo!(),
                Tokens::Whitespace => todo!(),
                Tokens::Newline => todo!(),
                Tokens::Public => todo!(),
                Tokens::Private => todo!(),
                Tokens::Unknown => todo!(),
                Tokens::String => {
                    let mut raw = token.content(self.input).unwrap();
                    let flag_raw = raw.chars().nth(0).unwrap();

                    let flag = match flag_raw {
                        'r' => Some(StringFlags::Raw),
                        'b' => Some(StringFlags::Byte),
                        '"' => None,

                        // Throw error here
                        _ => {
                            let src = Source {
                                file: "yes".to_owned(),
                                line: self.pos + 1,
                                start: token.span.start,
                                end: 1,
                                code: Some(self.get_line().to_string()),
                                source_object: "TopLevel".to_string(),
                            };
                            let mut err =
                                Error::new(Errors::ValueError, "Invalid string flag", src);
                            err.set_solution(
                                &format!("remove `{}` before string", flag_raw.to_string().bold()),
                                Some(&format!(
                                    "{}{}",
                                    flag_raw.to_string().strikethrough().bright_black(),
                                    &raw[1..]
                                )),
                            );
                            err.add_pointer("expected \"r\" or \"b\"", token.span.start, token.span.start);
                            err.add_pointer("string defined here", token.span.start+1, token.span.end);
                            err.throw();
                        }
                    };

                    let span = if flag.is_none() {
                        raw = &raw[1..raw.len() - 1];
                        Span::new(token.span.start + 1, token.span.end - 1)
                    } else {
                        raw = &raw[2..raw.len() - 1];
                        Span::new(token.span.start + 1, token.span.end - 1)
                    };
                    let data = Values::String(StringInner::new(raw.as_bytes(), flag));

                    Some(Expr::new(Exprs::Value(Value { data, span }), token.span))
                }
                Tokens::Char => {
                    let raw = token.content(&self.input).unwrap();

                    if raw.len() < 3 || raw.len() > 4 {
                        let src = Source {
                            file: "yes".to_owned(),
                            line: self.pos + 1,
                            start: token.span.start,
                            end: token.span.end,
                            code: Some(self.get_line().to_string()),
                            source_object: "TopLevel".to_string(),
                        };
                        let mut err = Error::new(
                            Errors::ValueError,
                            &format!(
                                "Declaration of char is too {}",
                                if raw.len() < 3 { "short" } else { "long" }
                            ),
                            src,
                        );
                        if raw.len() > 3 {
                            err.set_solution(
                                "Did you mean to create string?",
                                Some(&format!(
                                    "{}{}{}",
                                    "\"".bold(),
                                    &raw[1..raw.len() - 1],
                                    "\"".bold()
                                )),
                            );
                            err.add_tip(&format!(
                                "use {} to convert string to char",
                                "String.toChar()".bold()
                            ));
                        }
                        err.throw();
                    }

                    let actual_char = &raw[1..raw.len() - 1];
                    let data = Values::Char(actual_char.parse().unwrap_or_else(|_| {
                        let src = Source {
                            file: "yes".to_owned(),
                            line: self.pos + 1,
                            start: token.span.start,
                            end: token.span.end,
                            code: Some(self.get_line().to_string()),
                            source_object: "TopLevel".to_string(),
                        };
                        if raw.len() > 3 {
                            let mut err = Error::new(
                                Errors::ValueError,
                                "Declaration of char is too long",
                                src,
                            );
                            err.set_solution(
                                "Did you mean to create string?",
                                Some(&format!(
                                    "{}{}{}",
                                    "\"".bold(),
                                    &raw[1..raw.len() - 1],
                                    "\"".bold(),
                                )),
                            );
                            err.add_tip(&format!(
                                "use {} to convert string to char",
                                "String.toChar()".bold()
                            ));
                            err.throw();
                        } else {
                            Error::new(
                                Errors::ValueError,
                                "Invalid character in char definition",
                                src,
                            )
                            .throw();
                        }
                    }));

                    let span = Span::new(token.span.start + 1, token.span.end - 1);

                    Some(Expr::new(Exprs::Value(Value { data, span }), token.span))
                }
                Tokens::True => Some(Expr::new(
                    Exprs::Value(Value {
                        data: Values::Bool(true),
                        span: token.span,
                    }),
                    token.span,
                )),
                Tokens::False => Some(Expr::new(
                    Exprs::Value(Value {
                        data: Values::Bool(false),
                        span: token.span,
                    }),
                    token.span,
                )),
                Tokens::Enum => todo!(),
                Tokens::StringType => todo!(),
                Tokens::CharType => todo!(),
                Tokens::IntType => todo!(),
                Tokens::FloatType => todo!(),
                Tokens::BoolType => todo!(),
                Tokens::ArrayType => todo!(),
                Tokens::DictType => todo!(),
            }
        } else {
            None
        }
        // output
    }

    pub fn parse(&mut self, input: &mut String) -> TopLevel {
        let mut output = TopLevel::new();

        while let Some(token) = self.next(input) {
            match token.data {
                Tokens::Enum => {}
                Tokens::Object => {}
                Tokens::Declare => {
                    if let Some(token) = self.peek(input) {
                        match token.data {
                            Tokens::Const => {
                                self.parse_expr(input).unwrap();
                            }
                            Tokens::Type => {}

                            // Expected `type` or `const`
                            _ => {}
                        }
                    } else {
                        // Expected `type` or `const`
                    }
                }
                Tokens::Requires => {
                    if let Some(peek) = self.peek(input) {
                        if peek.data == Tokens::String {
                            if_chain! {
                                if let Some(Expr { data, .. }) = self.parse_expr(input);
                                if let Exprs::Value(val) = data;
                                if let Values::String(StringInner {mut bytes, ..}) = val.data;
                                then {
                                    let mut buf = String::new();
                                    bytes.read_to_string(&mut buf).unwrap();
                                    let span = Span::new(token.span.start, self.consumed_len);
                                    output.imports.push(Import::new(buf, span));
                                }
                            }
                        } else if peek.data == Tokens::Identifier {
                            self.next(input);
                            let span = Span::new(token.span.start, self.consumed_len);
                            output.imports.push(Import::new(
                                peek.content(self.input).unwrap().to_string(),
                                span,
                            ));
                        } else {
                            // Expected string or identifier
                        }
                    } else {
                        // Expected string or identifier
                    }
                }
                Tokens::Template => {}

                // Throw unexpected token error
                _ => {
                    let src = Source {
                        file: "yes".to_owned(),
                        line: self.pos + 1,
                        start: token.span.start,
                        end: token.span.end,
                        code: Some(self.get_line().to_string()),
                        source_object: "TopLevel".to_string(),
                    };
                    let mut error = Error::new(
                        Errors::SyntaxError,
                        &format!(
                            "Unexpected token `{}`",
                            token.content(self.get_line()).unwrap()
                        ),
                        src,
                    );
                    match token.data {
                        Tokens::Uses => {
                            error.set_solution("`uses` keyword can be used only for objects", None);
                            error.add_pointer("expected object", token.span.start, token.span.end);
                        }
                        Tokens::Type => {
                            error.set_solution(
                                "Did you mean to declare a type?",
                                Some(&format!("{} {}", "declare".bold(), self.get_line())),
                            );
                            error.add_pointer("expected declaration statement", token.span.start, token.span.end);
                        }
                        Tokens::Const => {
                            error.set_solution(
                                "Did you mean to declare constant variable?",
                                Some(&format!("{} {}", "declare".bold(), self.get_line())),
                            );
                            error.add_pointer("expected declaration statement", token.span.start, token.span.end);
                        }
                        Tokens::Method => {
                            error.set_solution("Methods can be defined only in objects", None);
                            error.add_pointer("method declared here", token.span.start, token.span.end);
                            error.add_pointer("expected object", token.span.start, token.span.end);
                        }
                        _ => {
                            let mut suggestions: Vec<&str> = Vec::new();
                            let invalid_token = token.content(self.get_line()).unwrap();

                            error.add_pointer("invalid token/keyword", token.span.start, token.span.end);

                            for alias in ALIASES {
                                let jaro = strsim::jaro(invalid_token, alias.0);
                                if jaro >= 0.6 {
                                    suggestions.push(alias.1);
                                    error.add_pointer(&format!("did you mean {}? ({:.2}%)", alias.1.underline(), jaro*100.0), token.span.start, token.span.end);
                                }
                            }
                            if suggestions.len() == 0 {
                                for suggestion in SUGGESTIONS {
                                    let jaro = strsim::jaro(invalid_token, suggestion);
                                    if jaro >= 0.6 {
                                        suggestions.push(suggestion);
                                        error.add_pointer(&format!("did you mean {}? ({:.2}%)", suggestion.underline(), jaro*100.0), token.span.start, token.span.end);
                                    }
                                }
                            } else {
                                error.add_tip(
                                    &format!(
                                        "if you are new to typical-language,\nconsider reading our docs: {}",
                                        "https://[no docs rn]".underline()
                                    )
                                );
                            }
                        }
                    }

                    error.throw();
                }
            }
        }

        output
    }
}
