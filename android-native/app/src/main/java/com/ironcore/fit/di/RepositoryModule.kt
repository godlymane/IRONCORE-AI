package com.ironcore.fit.di

import com.ironcore.fit.data.repository.ArenaRepository
import com.ironcore.fit.data.repository.BillingRepository
import com.ironcore.fit.data.repository.FitnessRepository
import com.ironcore.fit.data.repository.SocialRepository
import com.ironcore.fit.data.repository.UserRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Repositories are constructor-injected, so Hilt resolves them automatically.
 * This module exists as a placeholder for future custom bindings (e.g. interfaces).
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule
