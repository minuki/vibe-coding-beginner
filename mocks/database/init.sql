CREATE TABLE IF NOT EXISTS mentors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    topics TEXT[] NOT NULL DEFAULT '{}',
    bio TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    mentor_id TEXT NOT NULL REFERENCES mentors(id),
    mentee_id TEXT NOT NULL,
    goal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO mentors (id, name, title, topics, bio) VALUES
    ('mentor-01', '김하늘', '제품 기획 리드', ARRAY['제품 기획', '커리어 전환'], '사용자 문제를 제품 기회로 구체화하는 과정을 함께 나눕니다.'),
    ('mentor-02', '박서준', '데이터 분석가', ARRAY['데이터 분석', '업무 자동화'], '데이터로 질문을 정의하고 반복 업무를 개선한 경험을 나눕니다.'),
    ('mentor-03', '이서연', '디자인 매니저', ARRAY['UX 디자인', '협업'], '사용자 관점의 디자인과 다양한 직군과의 협업을 돕습니다.'),
    ('mentor-04', '정민수', '엔지니어링 매니저', ARRAY['기술 커리어', '리더십'], '기술 조직에서의 성장과 커뮤니케이션을 함께 고민합니다.')
ON CONFLICT (id) DO NOTHING;
