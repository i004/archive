use crate::lexer::{Rule, Tokens};
use fancy_regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    pub static ref RULES: [Rule; 78] = [
    Rule {
        kind: Tokens::Arrow,
        re: Regex::new(r"^->").unwrap(),
    },
    Rule {
        kind: Tokens::Comma,
        re: Regex::new(r"^,").unwrap(),
    },
    Rule {
        kind: Tokens::Dot,
        re: Regex::new(r"^\.").unwrap(),
    },
    Rule {
        kind: Tokens::LSquare,
        re: Regex::new(r"^\[").unwrap(),
    },
    Rule {
        kind: Tokens::RSquare,
        re: Regex::new(r"^\]").unwrap(),
    },
    Rule {
        kind: Tokens::LParen,
        re: Regex::new(r"^\(").unwrap(),
    },
    Rule {
        kind: Tokens::RParen,
        re: Regex::new(r"^\)").unwrap(),
    },
    Rule {
        kind: Tokens::LCurly,
        re: Regex::new(r"^{").unwrap(),
    },
    Rule {
        kind: Tokens::RCurly,
        re: Regex::new(r"^}").unwrap(),
    },
    Rule {
        kind: Tokens::Plus,
        re: Regex::new(r"^\+").unwrap(),
    },
    Rule {
        kind: Tokens::Minus,
        re: Regex::new(r"^-").unwrap(),
    },
    Rule {
        kind: Tokens::Percent,
        re: Regex::new(r"^%").unwrap(),
    },
    Rule {
        kind: Tokens::Equals,
        re: Regex::new(r"^=").unwrap(),
    },
    Rule {
        kind: Tokens::Bang,
        re: Regex::new(r"^!").unwrap(),
    },
    Rule {
        kind: Tokens::Question,
        re: Regex::new(r"^\?").unwrap(),
    },
    Rule {
        kind: Tokens::LessThan,
        re: Regex::new(r"^<").unwrap(),
    },
    Rule {
        kind: Tokens::GreaterThan,
        re: Regex::new(r"^>").unwrap(),
    },
    Rule {
        kind: Tokens::ForwardSlash,
        re: Regex::new(r"^/").unwrap(),
    },
    Rule {
        kind: Tokens::BitOr,
        re: Regex::new(r"^\|").unwrap(),
    },
    Rule {
        kind: Tokens::BitAnd,
        re: Regex::new(r"^&").unwrap(),
    },
    Rule {
        kind: Tokens::Semicolon,
        re: Regex::new(r"^;").unwrap(),
    },
    Rule {
        kind: Tokens::Colon,
        re: Regex::new(r"^:").unwrap(),
    },
    Rule {
        kind: Tokens::Dollar,
        re: Regex::new(r"^\$").unwrap(),
    },
    Rule {
        kind: Tokens::At,
        re: Regex::new(r"^@").unwrap(),
    },
    Rule {
        kind: Tokens::Hash,
        re: Regex::new(r"^#").unwrap(),
    },
    Rule {
        kind: Tokens::Star,
        re: Regex::new(r"^\*").unwrap(),
    },
    Rule {
        kind: Tokens::Xor,
        re: Regex::new(r"^\^").unwrap(),
    },
    Rule {
        kind: Tokens::Comment,
        re: Regex::new(r"^//").unwrap(),
    },
    Rule {
        kind: Tokens::MultilineComment,
        re: Regex::new(r"^(/\*|\*/)").unwrap(),
    },
    Rule {
        kind: Tokens::PipeLine,
        re: Regex::new(r"^\|>").unwrap(),
    },
    Rule {
        kind: Tokens::ThrowError,
        re: Regex::new(r"^\!>").unwrap(),
    },
    Rule {
        kind: Tokens::LogicalOr,
        re: Regex::new(r"^\|\|").unwrap(),
    },
    Rule {
        kind: Tokens::LogicalAnd,
        re: Regex::new(r"^&&").unwrap(),
    },
    Rule {
        kind: Tokens::LogicalEq,
        re: Regex::new(r"^={2}").unwrap(),
    },
    Rule {
        kind: Tokens::FatArrow,
        re: Regex::new(r"^=>").unwrap(),
    },
    Rule {
        kind: Tokens::Int,
        re: Regex::new(r"^\d+").unwrap(),
    },
    Rule {
        kind: Tokens::Float,
        re: Regex::new(r"^\d+\.\d+").unwrap(),
    },
    Rule {
        kind: Tokens::Whitespace,
        re: Regex::new(r"^ ").unwrap(),
    },
    Rule {
        kind: Tokens::Newline,
        re: Regex::new(r"^[\n|\r\n]").unwrap(),
    },
    Rule {
        kind: Tokens::Return,
        re: Regex::new(r"^return").unwrap(),
    },
    Rule {
        kind: Tokens::For,
        re: Regex::new(r"^for").unwrap(),
    },
    Rule {
        kind: Tokens::While,
        re: Regex::new(r"^while").unwrap(),
    },
    Rule {
        kind: Tokens::In,
        re: Regex::new(r"^in").unwrap(),
    },
    Rule {
        kind: Tokens::Else,
        re: Regex::new(r"^else").unwrap(),
    },
    Rule {
        kind: Tokens::Match,
        re: Regex::new(r"^match").unwrap(),
    },
    Rule {
        kind: Tokens::Break,
        re: Regex::new(r"^break").unwrap(),
    },
    Rule {
        kind: Tokens::Continue,
        re: Regex::new(r"^continue").unwrap(),
    },
    Rule {
        kind: Tokens::Object,
        re: Regex::new(r"^object").unwrap(),
    },
    Rule {
        kind: Tokens::Requires,
        re: Regex::new(r"^requires").unwrap(),
    },
    Rule {
        kind: Tokens::Null,
        re: Regex::new(r"^null").unwrap(),
    },
    Rule {
        kind: Tokens::Package,
        re: Regex::new(r"^package").unwrap(),
    },
    Rule {
        kind: Tokens::Declare,
        re: Regex::new(r"^declare").unwrap(),
    },
    Rule {
        kind: Tokens::New,
        re: Regex::new(r"^new").unwrap(),
    },
    Rule {
        kind: Tokens::Const,
        re: Regex::new(r"^const").unwrap(),
    },
    Rule {
        kind: Tokens::Type,
        re: Regex::new(r"^type").unwrap(),
    },
    Rule {
        kind: Tokens::Template,
        re: Regex::new(r"^template").unwrap(),
    },
    Rule {
        kind: Tokens::Method,
        re: Regex::new(r"^method").unwrap(),
    },
    Rule {
        kind: Tokens::Uses,
        re: Regex::new(r"^uses").unwrap(),
    },
    Rule {
        kind: Tokens::True,
        re: Regex::new(r"^true").unwrap(),
    },
    Rule {
        kind: Tokens::False,
        re: Regex::new(r"^false").unwrap(),
    },
    Rule {
        kind: Tokens::Enum,
        re: Regex::new(r"^enum").unwrap(),
    },
    Rule {
        kind: Tokens::Public,
        re: Regex::new(r"^public").unwrap(),
    },
    Rule {
        kind: Tokens::Private,
        re: Regex::new(r"^private").unwrap(),
    },
    Rule {
        kind: Tokens::StringType,
        re: Regex::new(r"^String").unwrap(),
    },
    Rule {
        kind: Tokens::CharType,
        re: Regex::new(r"^Char").unwrap(),
    },
    Rule {
        kind: Tokens::IntType,
        re: Regex::new(r"^Int").unwrap(),
    },
    Rule {
        kind: Tokens::FloatType,
        re: Regex::new(r"^Float").unwrap(),
    },
    Rule {
        kind: Tokens::BoolType,
        re: Regex::new(r"^Bool").unwrap(),
    },
    Rule {
        kind: Tokens::ArrayType,
        re: Regex::new(r"^Array").unwrap(),
    },
    Rule {
        kind: Tokens::DictType,
        re: Regex::new(r"^Dict").unwrap(),
    },
    Rule {
        kind: Tokens::Operator,
        re: Regex::new(r"^operator").unwrap(),
    },

    Rule {
        kind: Tokens::String,
        re: Regex::new(r#"^[a-z]?"((\\[A-z\\"])|[^\\"])*""#).unwrap(),
    },
    Rule {
        kind: Tokens::Char,
        re: Regex::new(r"^'.*'").unwrap(),
    },
    Rule {
        kind: Tokens::Extend,
        re: Regex::new(r"^extend").unwrap()
    },
    Rule {
        kind: Tokens::Static,
        re: Regex::new(r"^static").unwrap()
    },
    Rule {
        kind: Tokens::Override,
        re: Regex::new(r"^override").unwrap()
    },
    Rule {
        kind: Tokens::With,
        re: Regex::new(r"^with").unwrap()
    },
    // Needs to be last
    Rule {
        kind: Tokens::Identifier,
        re: Regex::new(r"^\w+").unwrap(),
    },
];

}
