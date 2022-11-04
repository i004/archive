use criterion::{black_box, criterion_group, criterion_main, Criterion};
use typical_language::{rules::RULES, lexer::Lexer};

pub fn criterion_b(c: &mut Criterion) {
    let mut input = String::from(r#"requires "a""#);
    let input_static = input.clone();
    let mut lexer = Lexer::build(RULES.to_owned(), &input_static);

    c.bench_function("Lexer", |b| {
        b.iter(black_box(|| {
            lexer.parse(&mut input);
        }))
    });
}

criterion_group!(benches, criterion_b);
criterion_main!(benches);