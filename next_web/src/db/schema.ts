import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	email: text('email').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
});

export const spotifyAccess = pgTable('spotify_access', {
	userId: uuid('user_id')
		.notNull()
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	isAllowlisted: boolean('is_allowlisted').notNull().default(false),
	lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true, mode: 'date' }),
});

export const playlists = pgTable(
	'playlists',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		mood: text('mood').notNull(),
		spotifyPlaylistUrl: text('spotify_playlist_url').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		userIdIdx: index('playlists_user_id_idx').on(table.userId),
	})
);

export const usersRelations = relations(users, ({ one, many }) => ({
	spotifyAccess: one(spotifyAccess, {
		fields: [users.id],
		references: [spotifyAccess.userId],
	}),
	playlists: many(playlists),
}));

export const spotifyAccessRelations = relations(spotifyAccess, ({ one }) => ({
	user: one(users, {
		fields: [spotifyAccess.userId],
		references: [users.id],
	}),
}));

export const playlistsRelations = relations(playlists, ({ one }) => ({
	user: one(users, {
		fields: [playlists.userId],
		references: [users.id],
	}),
}));
