package com.eutonafila.mineiro.network

import com.eutonafila.mineiro.BuildConfig
import com.google.gson.annotations.SerializedName
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class Ticket(
    val id: Int,
    @SerializedName("shop_id") val shopId: Int,
    @SerializedName("service_id") val serviceId: Int,
    @SerializedName("customer_name") val customerName: String,
    val status: String,
    val position: Int
)

data class CreateTicketRequest(
    @SerializedName("customer_name") val customerName: String,
    @SerializedName("service_id") val serviceId: Int
)

interface ApiService {
    @GET("api/shops/{slug}/queue")
    suspend fun getQueue(@Path("slug") slug: String): QueueResponse

    @POST("api/shops/{slug}/tickets")
    suspend fun createTicket(
        @Path("slug") slug: String,
        @Body request: CreateTicketRequest
    ): Ticket

    @PATCH("api/tickets/{id}/status")
    suspend fun updateTicketStatus(
        @Path("id") id: Int,
        @Body status: Map<String, String>
    ): Ticket
}

data class QueueResponse(
    val shop: Shop,
    val tickets: List<Ticket>
)

data class Shop(
    val id: Int,
    val slug: String,
    val name: String
)

object ApiClient {
    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val service: ApiService = retrofit.create(ApiService::class.java)
}

