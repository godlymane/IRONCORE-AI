package com.ironcore.fit.ui.chronicle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.FeedEvent
import com.ironcore.fit.data.repository.SocialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale
import javax.inject.Inject

// ── UI State ─────────────────────────────────────────────────────────

data class ChronicleUiState(
    val selectedDate: String = LocalDate.now().toString(),
    val dates: List<DateItem> = emptyList(),
    val feedEvents: List<FeedEvent> = emptyList(),
    val filteredEvents: List<FeedEvent> = emptyList(),
    val isLoading: Boolean = true
)

data class DateItem(
    val date: String, // yyyy-MM-dd
    val dayLabel: String, // "Mon", "Tue", etc.
    val dayNum: Int
)

// ── ViewModel ────────────────────────────────────────────────────────

@HiltViewModel
class ChronicleViewModel @Inject constructor(
    private val socialRepo: SocialRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChronicleUiState())
    val uiState: StateFlow<ChronicleUiState> = _uiState.asStateFlow()

    init {
        // Build date list (last 30 days)
        val today = LocalDate.now()
        val dateItems = (29 downTo 0).map { daysAgo ->
            val d = today.minusDays(daysAgo.toLong())
            DateItem(
                date = d.toString(),
                dayLabel = d.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.US),
                dayNum = d.dayOfMonth
            )
        }
        _uiState.update { it.copy(dates = dateItems, selectedDate = today.toString()) }

        // Load activity feed
        viewModelScope.launch {
            socialRepo.feedFlow(100).collect { events ->
                _uiState.update { state ->
                    state.copy(
                        feedEvents = events,
                        filteredEvents = events.filter { event ->
                            eventMatchesDate(event, state.selectedDate)
                        },
                        isLoading = false
                    )
                }
            }
        }
    }

    fun selectDate(date: String) {
        _uiState.update { state ->
            state.copy(
                selectedDate = date,
                filteredEvents = state.feedEvents.filter { event ->
                    eventMatchesDate(event, date)
                }
            )
        }
    }

    private fun eventMatchesDate(event: FeedEvent, date: String): Boolean {
        val eventTimestamp = event.createdAt ?: return false
        val eventDate = eventTimestamp.toDate().toInstant()
            .atZone(java.time.ZoneId.systemDefault())
            .toLocalDate().toString()
        return eventDate == date
    }
}
