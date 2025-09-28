### Instructions ###
Let's start creating the Add New Trade page in which user could enter the trade information. Trade page will have two sections
1 - One section to enter the trade manually.
2 - Import Page in which user could upload the trade data using a csv file or importer api for example for Interactive broker or other broker.

in the manual trading page add the following field:
    Symbol e.g. AAPL or TSLA231018C00200000
    Trade Type (Long or Short dropdown)
    Asset Type (Stock, Option, Future, Crypto, ETF, Bond)
    Entry Price
    Exit Price
    Stop Loss
    Standard Lot Size  = 100 By Default for American Options
    Quantity (e.g. 100). If Asset Type is Option, Multiply the Entry and exit Price by Standard Lot Size which will either be set by the user or defaults to 100.
    Example with a Standard Lot Size of 100 share in a contract for Option Trade:
        Asset Type = Options
        Quantity = 1
        Entry Price = 1.50
        Total purchase Cost  1.50 * 100 = 150
        Exit Price = 2.00
        Total Selling Costr  2.00 * 100 = 200
        Stop Loss = 0.50
        Total Cost  0.50 * 100 = 50
        When saving the data, in the database Trade Profit will be calcualted as (Total Selling Cost - Total Cost) i.e. 200 - 150 = 50
    Trade Entry Date (Calendar, Default Current Date)
    Trade Exit Date (Calendar). If trade exit date is missing then trade status will default to open which means final Profit or loss will not be calculated.
    Trade Status (Open Or Close). Based on the trade Status Profit or loss should be calcualted.
    Strategy : Pulled From the Stratgey database entries created by the user. Default to None
    Tags: Optional, pulled from the database and ability to pick the desired tags
    Notes: Optional


    