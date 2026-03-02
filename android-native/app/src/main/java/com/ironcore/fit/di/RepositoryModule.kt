package com.ironcore.fit.di

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.storage.FirebaseStorage
import com.ironcore.fit.data.remote.CloudFunctions
import com.ironcore.fit.data.repository.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing repository and Cloud Functions instances.
 *
 * All repositories use constructor injection but are explicitly
 * provided here so Hilt can resolve the dependency graph cleanly.
 * Firebase SDK instances come from AppModule.
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideCloudFunctions(functions: FirebaseFunctions): CloudFunctions =
        CloudFunctions(functions)

    @Provides
    @Singleton
    fun provideUserRepository(auth: FirebaseAuth, db: FirebaseFirestore): UserRepository =
        UserRepository(auth, db)

    @Provides
    @Singleton
    fun provideWorkoutRepository(auth: FirebaseAuth, db: FirebaseFirestore): WorkoutRepository =
        WorkoutRepository(auth, db)

    @Provides
    @Singleton
    fun provideNutritionRepository(auth: FirebaseAuth, db: FirebaseFirestore): NutritionRepository =
        NutritionRepository(auth, db)

    @Provides
    @Singleton
    fun provideArenaRepository(
        auth: FirebaseAuth,
        db: FirebaseFirestore,
        cf: CloudFunctions
    ): ArenaRepository = ArenaRepository(auth, db, cf)

    @Provides
    @Singleton
    fun provideGuildRepository(
        auth: FirebaseAuth,
        db: FirebaseFirestore,
        cf: CloudFunctions
    ): GuildRepository = GuildRepository(auth, db, cf)

    @Provides
    @Singleton
    fun provideFitnessRepository(
        db: FirebaseFirestore,
        storage: FirebaseStorage
    ): FitnessRepository = FitnessRepository(db, storage)

    @Provides
    @Singleton
    fun provideSocialRepository(db: FirebaseFirestore): SocialRepository =
        SocialRepository(db)
}
