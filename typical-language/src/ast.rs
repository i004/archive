use crate::lexer::{Span, Spanned, Token};

pub type Expr<'a> = Spanned<Exprs<'a>>;
pub type Type = Spanned<Types>;
pub type Const<'a> = Spanned<Constant<'a>>;
pub type Import = Spanned<Imprt>;
pub type Value<'a> = Spanned<Values<'a>>;
pub type UserType<'a> = Spanned<UserTypes<'a>>;
pub type Statement<'a> = Spanned<Stmt<'a>>;

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct TopLevel<'a> {
    pub types: Vec<UserType<'a>>,
    pub imports: Vec<Import>,
    pub constants: Vec<Const<'a>>,
}

impl<'a> TopLevel<'a> {
    pub fn new() -> Self {
        TopLevel {
            constants: Vec::new(),
            imports: Vec::new(),
            types: Vec::new(),
        }
    }
}

impl Import {
    pub fn new(path: String, span: Span) -> Self {
        Import {
            data: Imprt { path },
            span,
        }
    }
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum UserTypes<'a> {
    Object(ObjectInner<'a>),
    Template(TemplateInner<'a>),
    Enum(EnumInner),
    Type(TypeInner),
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum Exprs<'a> {
    Value(Value<'a>),
    Identifier(String),
    Block(Statement<'a>),
    If(IfInner<'a>),
    ThrowError(Vec<Expr<'a>>),
    AssertError(bool, Vec<Expr<'a>>),
    Declaration(DeclInner<'a>),
    FunctionCall(FnCallInner<'a>),
    TypeCast(Value<'a>, Type),
}

impl<'a> Expr<'a> {
    pub fn new(data: Exprs<'a>, span: Span) -> Self {
        Expr { data, span }
    }
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum Values<'a> {
    String(StringInner<'a>),
    Float(f64),
    Int(i64),
    Bool(bool),
    Char(char),
    Array((Vec<Expr<'a>>, Types)),
    Dict((Vec<(Value<'a>, Value<'a>)>, (Types, Types))),
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct Stmt<'a> {
    entries: Vec<Expr<'a>>,
    final_: Box<Expr<'a>>,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum StringFlags {
    Raw,
    Byte,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum DeclVisibility {
    Public,
    Private,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub enum Types {
    String,
    Int,
    Float,
    Bool,
    Char,
    Array(Box<Type>),
    Dict((Box<Type>, Box<Type>)),
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct DeclInner<'a> {
    visibility: Option<DeclVisibility>,
    val: Value<'a>,
    typ: Types,
    name: String,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct StringInner<'a> {
    pub bytes: &'a [u8],
    flags: Option<StringFlags>,
}

impl<'a> StringInner<'a> {
    pub fn new(bytes: &'a [u8], flags: Option<StringFlags>) -> Self {
        StringInner { bytes, flags }
    }
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct IfInner<'a> {
    cond: Vec<Expr<'a>>,

    /// `Exprs::Block(..);`
    code: Box<Expr<'a>>,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct FnCallInner<'a> {
    name: String,
    args: Vec<Expr<'a>>,
}

impl<'a> FnCallInner<'a> {
    pub fn new(name: String, args: Vec<Expr<'a>>) -> Self {
        Self { name, args }
    }
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct EnumInner {
    variants: Vec<(String, Vec<Type>)>,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct TypeInner {
    inner: Type,
}

impl From<Token> for Type {
    fn from(_: Token) -> Self {
        todo!()
    }
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct ObjectInner<'a> {
    fields: Vec<(String, Expr<'a>)>,
    methods: Vec<MethodInner<'a>>,
    operators: Vec<OperatorInner<'a>>
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct TemplateInner<'a> {
    fields: Vec<(String, Type)>,
    methods: Vec<MethodInner<'a>>,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct Imprt {
    path: String,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct OperatorInner<'a> {
    params: Vec<(String, Type)>,
    expr: Expr<'a>
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct MethodInner<'a> {
    params: Vec<(String, Type)>,
    expr: Expr<'a>,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct MethodHeadInner {
    params: Vec<(String, Type)>,
}

#[derive(Debug, Clone, PartialEq, PartialOrd)]
pub struct Constant<'a> {
    name: String,
    typ: Type,
    value: Value<'a>,
}
