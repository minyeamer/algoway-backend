-- 알고타 (Algo-Way) 데이터베이스 초기화 스크립트

-- PostGIS 확장 활성화 (지리 기반 쿼리용)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    profile_image TEXT,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'employee', 'others')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_badge VARCHAR(50),
    manner_score DECIMAL(3, 2) DEFAULT 5.0 CHECK (manner_score >= 1 AND manner_score <= 5),
    total_rides INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이메일 인증 코드 테이블
CREATE TABLE IF NOT EXISTS verification_codes (
    code_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('student', 'employee', 'others')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 리프레시 토큰 테이블
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 팟 (카풀) 테이블
CREATE TABLE IF NOT EXISTS pods (
    pod_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    departure_place_name VARCHAR(255) NOT NULL,
    departure_location GEOGRAPHY(POINT, 4326) NOT NULL,
    arrival_place_name VARCHAR(255) NOT NULL,
    arrival_location GEOGRAPHY(POINT, 4326) NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER NOT NULL CHECK (max_participants >= 2 AND max_participants <= 4),
    current_participants INTEGER DEFAULT 1 CHECK (current_participants <= max_participants),
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('taxi', 'personal')),
    estimated_cost INTEGER,
    cost_per_person INTEGER,
    memo TEXT,
    status VARCHAR(20) DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'full', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 팟 참여자 테이블
CREATE TABLE IF NOT EXISTS pod_participants (
    participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL REFERENCES pods(pod_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pod_id, user_id)
);

-- 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
    chat_room_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL UNIQUE REFERENCES pods(pod_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(chat_room_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'location', 'status', 'system')),
    content TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 준비 상태 테이블
CREATE TABLE IF NOT EXISTS ready_status (
    status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(chat_room_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_ready BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_room_id, user_id)
);

-- 평가 테이블 (개선: 컬럼명 일관성)
CREATE TABLE IF NOT EXISTS ratings (
    rating_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL REFERENCES pods(pod_id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[],
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pod_id, reviewer_id, reviewee_id)
);

-- 즐겨찾는 경로 테이블
CREATE TABLE IF NOT EXISTS favorite_routes (
    favorite_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    departure_place_name VARCHAR(255) NOT NULL,
    departure_location GEOGRAPHY(POINT, 4326) NOT NULL,
    arrival_place_name VARCHAR(255) NOT NULL,
    arrival_location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 테이블 (개선: type 값 업데이트)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pod_joined', 'pod_full', 'pod_started', 'pod_completed', 'message', 'rating', 'system')),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 설정 테이블 (개선: 컬럼명 일관성)
CREATE TABLE IF NOT EXISTS notification_settings (
    settings_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    pod_joined BOOLEAN DEFAULT TRUE,
    pod_full BOOLEAN DEFAULT TRUE,
    pod_started BOOLEAN DEFAULT TRUE,
    pod_completed BOOLEAN DEFAULT TRUE,
    message BOOLEAN DEFAULT TRUE,
    rating BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_pods_status ON pods(status);
CREATE INDEX IF NOT EXISTS idx_pods_departure_time ON pods(departure_time);
CREATE INDEX IF NOT EXISTS idx_pod_participants_pod_id ON pod_participants(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_participants_user_id ON pod_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- 지리 인덱스 (PostGIS GIST)
CREATE INDEX IF NOT EXISTS idx_pods_departure_location ON pods USING GIST(departure_location);
CREATE INDEX IF NOT EXISTS idx_pods_arrival_location ON pods USING GIST(arrival_location);

-- 복합 인덱스 (개선: 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_pods_status_departure_time ON pods(status, departure_time);
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_created ON messages(chat_room_id, created_at DESC);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pods_updated_at BEFORE UPDATE ON pods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 트리거: ready_status updated_at 자동 업데이트 (개선: 추가)
CREATE TRIGGER update_ready_status_updated_at BEFORE UPDATE ON ready_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 트리거: 팟 참여 시 current_participants 자동 증가
CREATE OR REPLACE FUNCTION increment_pod_participants()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pods 
    SET current_participants = current_participants + 1
    WHERE pod_id = NEW.pod_id;
    
    -- 정원이 다 찼으면 상태 변경
    UPDATE pods 
    SET status = 'full'
    WHERE pod_id = NEW.pod_id 
    AND current_participants >= max_participants;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_pod_participant_added AFTER INSERT ON pod_participants
    FOR EACH ROW EXECUTE FUNCTION increment_pod_participants();

-- 트리거: 팟 참여 취소 시 current_participants 자동 감소
CREATE OR REPLACE FUNCTION decrement_pod_participants()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pods 
    SET current_participants = current_participants - 1,
        status = CASE 
            WHEN status = 'full' THEN 'recruiting'
            ELSE status
        END
    WHERE pod_id = OLD.pod_id;
    
    RETURN OLD;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_pod_participant_removed AFTER DELETE ON pod_participants
    FOR EACH ROW EXECUTE FUNCTION decrement_pod_participants();

-- 트리거: 평가 시 매너 점수 자동 업데이트 (개선: 컬럼명 변경)
CREATE OR REPLACE FUNCTION update_manner_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET manner_score = (
        SELECT AVG(rating)::DECIMAL(3,2)
        FROM ratings
        WHERE reviewee_id = NEW.reviewee_id
    )
    WHERE user_id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_rating_added AFTER INSERT ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_manner_score();

-- 트리거: 팟 완료 시 total_rides 증가
CREATE OR REPLACE FUNCTION increment_total_rides()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE users
        SET total_rides = total_rides + 1
        WHERE user_id IN (
            SELECT user_id FROM pod_participants WHERE pod_id = NEW.pod_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_pod_completed AFTER UPDATE ON pods
    FOR EACH ROW EXECUTE FUNCTION increment_total_rides();

-- 트리거: 팟 생성 시 채팅방 자동 생성
CREATE OR REPLACE FUNCTION create_chat_room_for_pod()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO chat_rooms (pod_id) VALUES (NEW.pod_id);
    
    -- 방장을 참여자에 추가
    INSERT INTO pod_participants (pod_id, user_id) VALUES (NEW.pod_id, NEW.creator_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_pod_created AFTER INSERT ON pods
    FOR EACH ROW EXECUTE FUNCTION create_chat_room_for_pod();

-- 트리거: 사용자 회원가입 시 알림 설정 자동 생성
CREATE OR REPLACE FUNCTION create_notification_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_settings (user_id) VALUES (NEW.user_id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_user_created AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_notification_settings_for_user();

-- 만료된 인증 코드 정리 함수 (cron job으로 실행 권장)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM verification_codes
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ language 'plpgsql';

-- 만료된 리프레시 토큰 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW();
END;
$$ language 'plpgsql';
